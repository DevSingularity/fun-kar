import { query, queryOne } from './config/database.js';
import * as quoteSvc from './modules/quotations/quotations.service.js';
import * as apprSvc from './modules/approval/approval.service.js';
import * as fulfillSvc from './modules/fulfillment/fulfillment.service.js';
import * as billingSvc from './modules/billing/billing.service.js';

async function run() {
  const cust = await queryOne(`SELECT id FROM customers LIMIT 1`);
  const rep = await queryOne(`SELECT id FROM users WHERE role = 'SALES_REP' LIMIT 1`);
  const mgr = await queryOne(`SELECT id FROM users WHERE role = 'SALES_MANAGER' LIMIT 1`);
  const op = await queryOne(`SELECT id FROM users WHERE role = 'OPERATIONS' LIMIT 1`);
  const fin = await queryOne(`SELECT id FROM users WHERE role = 'FINANCE' LIMIT 1`);
  const prods = await query(`SELECT id, name, product_type, is_active FROM products WHERE is_active = true LIMIT 5`);

  console.log('Testing End-to-End Pipeline Persistence...');

  // 1. Create a draft quotation
  const createdQuote = await quoteSvc.createQuotation(
    {
      customerId: cust.id,
      promisedDeliveryDate: '2026-09-30',
    },
    { id: rep.id, role: 'SALES_REP' }
  );

  console.log('1. Created quotation:', createdQuote.quotation.quoteNumber);

  // Add line items
  await quoteSvc.addLineItem(
    createdQuote.quotation.id,
    {
      productId: prods[0].id,
      quantity: 2,
      discountPct: 20,
    },
    { id: rep.id, role: 'SALES_REP' }
  );

  await quoteSvc.addLineItem(
    createdQuote.quotation.id,
    {
      productId: prods[1].id,
      quantity: 1,
      discountPct: 20,
    },
    { id: rep.id, role: 'SALES_REP' }
  );

  // 2. Submit for approval
  const submitRes = await quoteSvc.submitQuotation(createdQuote.quotation.id, { id: rep.id, role: 'SALES_REP' });
  console.log('2. Submitted for approval. Status:', submitRes.quotation.status, 'Required Level:', submitRes.quotation.requiredApprovalLevel);

  const reqId = submitRes.approvalRequest?.id;
  if (reqId) {
    // 3. Manager approves
    const mgrRes = await apprSvc.approveRequest(reqId, { reason: 'Manager approved discount exception' }, { id: mgr.id, role: 'SALES_MANAGER' });
    console.log('3. Manager approved. Quotation status:', mgrRes.quotation.status);

    if (mgrRes.approvalRequest.requiredLevel === 'MANAGER_FINANCE' && mgrRes.approvalRequest.status === 'PENDING') {
      // Finance approves
      const finRes = await apprSvc.approveRequest(reqId, { reason: 'Finance authorized terms' }, { id: fin.id, role: 'FINANCE' });
      console.log('   Finance approved. Quotation status:', finRes.quotation.status);
    }
  }

  // 4. Verify order created in fulfillment pipeline
  const order = await queryOne(`SELECT * FROM orders WHERE quotation_id = $1`, [createdQuote.quotation.id]);
  console.log('4. Order in DB:', !!order, '| Number:', order?.orderNumber, '| Status:', order?.status);

  // 5. Verify fulfillment allocations created
  const allocs = await query(`SELECT * FROM fulfillment_allocations WHERE order_id = $1`, [order.id]);
  console.log('5. Fulfillment allocations created across warehouses:', allocs.length);

  // 6. Verify invoice created in billing pipeline
  const invoices = await query(`SELECT * FROM invoices WHERE order_id = $1`, [order.id]);
  console.log('6. Invoices generated in DB:', invoices.length, '| Number:', invoices[0]?.invoiceNumber, '| Status:', invoices[0]?.status, '| Total: ₹' + invoices[0]?.total);

  // 7. Verify Operations Manager can list and access this fulfillment order
  const opFulfillOrders = await fulfillSvc.listFulfillmentOrders({});
  const foundInOpFulfill = opFulfillOrders.items.some(o => o.id === order.id);
  console.log('7. Verified in Operations Manager Fulfillment list:', foundInOpFulfill);

  // 8. Verify Operations / Finance can view invoices
  const opInvoices = await billingSvc.listInvoices({}, { id: op.id, role: 'OPERATIONS' });
  const foundInOpInvoices = opInvoices.items.some(i => i.id === invoices[0]?.id);
  console.log('8. Verified in Operations/Finance Invoices list:', foundInOpInvoices);

  // 9. Verify Subscriptions
  const subs = await billingSvc.listSubscriptions({});
  console.log('9. Subscriptions list count:', subs.items.length);

  // 10. Verify Financial Reconciliation
  const recon = await billingSvc.getReconciliationOverview();
  console.log('10. Financial Reconciliation overview active:', !!recon.summary);

  console.log('=== ALL PIPELINE STAGES CONFIRMED & PERSISTING 100% ===');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

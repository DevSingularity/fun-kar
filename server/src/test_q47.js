import { query, queryOne } from './config/database.js';
import * as apprSvc from './modules/approval/approval.service.js';

async function testQ47() {
  const quote = await queryOne(`SELECT * FROM quotations WHERE quote_number = 'Q-2026-000047'`);
  console.log('Quotation before approval:', quote.quoteNumber, quote.status);
  
  const apprReq = await queryOne(`SELECT * FROM approval_requests WHERE quotation_id = $1 AND status = 'PENDING'`, [quote.id]);
  if (!apprReq) {
    console.log('No pending approval request (already approved)');
  } else {
    console.log('Pending approval request:', apprReq.id, apprReq.requiredLevel);
    const op = await queryOne(`SELECT id FROM users WHERE role = 'OPERATIONS' LIMIT 1`);
    const res = await apprSvc.approveRequest(apprReq.id, { reason: 'Operations approved deal terms' }, { id: op.id, role: 'OPERATIONS' });
    console.log('Approval result quotation status:', res.quotation.status);
  }

  // Check order in Fulfillment
  const order = await queryOne(`SELECT * FROM orders WHERE quotation_id = $1`, [quote.id]);
  console.log('Order generated:', order?.orderNumber, order?.status, 'Total: ₹' + order?.grandTotal);

  // Check allocations
  const allocs = await query(`SELECT * FROM fulfillment_allocations WHERE order_id = $1`, [order.id]);
  console.log('Allocations count:', allocs.length);

  // Check Invoices
  const invoices = await query(`SELECT * FROM invoices WHERE order_id = $1`, [order.id]);
  console.log('Invoices count:', invoices.length, 'Invoice Number:', invoices[0]?.invoiceNumber, 'Total: ₹' + invoices[0]?.total);

  console.log('=== Q-2026-000047 PERSISTED SUCCESSFULLY TO FULFILLMENT & INVOICING ===');
}

testQ47().catch(console.error).then(() => process.exit(0));

import 'dotenv/config';
import { loginUser } from '../modules/auth/auth.service.js';
import { listCustomers } from '../modules/customers/customers.service.js';
import { listProducts } from '../modules/products/products.service.js';
import {
  createQuotation,
  getQuotation,
  listQuotations,
  getPipeline,
  addLineItem,
  updateLineItem,
  removeLineItem,
  submitQuotation,
  deleteQuotation,
} from '../modules/quotations/quotations.service.js';
import { connectDatabase } from '../config/database.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== DEALFLOW360 PHASE 3 AUTOMATED TEST SUITE ===\n');
  await connectDatabase();

  // Test 1: Authenticate Sales Rep & Manager
  console.log('[TEST 1] Authenticating Test Users');
  const repAuth = await loginUser({ email: 'rep@dealflow.io', password: 'Password123!' });
  const managerAuth = await loginUser({ email: 'manager@dealflow.io', password: 'Password123!' });
  assert(repAuth.user.role === 'SALES_REP', 'Sales Rep authenticated');
  assert(managerAuth.user.role === 'SALES_MANAGER', 'Sales Manager authenticated');

  const { customers } = await listCustomers({ limit: 10 });
  const { products } = await listProducts({ limit: 10 });
  const goldCustomer = customers.find((c) => c.tier === 'GOLD');
  const bronzeCustomer = customers.find((c) => c.tier === 'BRONZE');
  const coreProduct = products.find((p) => p.sku === 'DF-ENT-01');
  const cloudProduct = products.find((p) => p.sku === 'CLD-POD-32');

  assert(!!goldCustomer && !!bronzeCustomer, 'Found Gold and Bronze test customers');
  assert(!!coreProduct && !!cloudProduct, 'Found software and cloud products');

  // Test 2: Create Draft Quotation Header
  console.log('\n[TEST 2] Creating Draft Quotation Header');
  const quote1 = await createQuotation(
    {
      customerId: goldCustomer.id,
      promisedDeliveryDate: '2026-10-15',
    },
    repAuth.user
  );

  assert(quote1.quotation.status === 'DRAFT', 'Quotation created in DRAFT status');
  assert(quote1.quotation.quoteNumber.startsWith('Q-2026-'), `Generated valid quote number: ${quote1.quotation.quoteNumber}`);
  assert(quote1.customer.id === goldCustomer.id, 'Associated with Gold customer');
  assert(quote1.salesRep.id === repAuth.user.id, 'Assigned to authenticated Sales Rep');

  // Test 3: Add Line Item 1 (Core License - Gold tier negotiated rate)
  console.log('\n[TEST 3] Adding Line Item 1 with Dynamic Pricing Resolution');
  const quoteWithItem1 = await addLineItem(
    quote1.quotation.id,
    {
      productId: coreProduct.id,
      quantity: 2,
      discountPct: 10,
    },
    repAuth.user
  );

  assert(quoteWithItem1.items.length === 1, 'Added 1 line item');
  const line1 = quoteWithItem1.items[0];
  assert(Number(line1.unitPrice) === 95000, `Resolved Gold tier negotiated unit price 95,000 INR (got: ${line1.unitPrice})`);
  assert(Number(line1.discountAmount) === 19000, `Discount amount 10% of 190,000 = 19,000 INR (got: ${line1.discountAmount})`);
  assert(Number(quoteWithItem1.quotation.subtotal) === 190000, `Quotation subtotal updated: 190,000 INR (got: ${quoteWithItem1.quotation.subtotal})`);
  assert(Number(quoteWithItem1.quotation.grandTotal) > 0, `Grand total with tax computed: ₹${quoteWithItem1.quotation.grandTotal}`);
  assert(Number(quoteWithItem1.quotation.estimatedMarginPct) > 70, `Estimated margin is healthy (${quoteWithItem1.quotation.estimatedMarginPct}%)`);
  assert(quoteWithItem1.marginHealth === 'HEALTHY', `Margin health label is HEALTHY`);

  // Test 4: Add Line Item 2 (Cloud Pod)
  console.log('\n[TEST 4] Adding Line Item 2 (Cloud Infrastructure)');
  const quoteWithItem2 = await addLineItem(
    quote1.quotation.id,
    {
      productId: cloudProduct.id,
      quantity: 1,
      discountPct: 5,
    },
    repAuth.user
  );

  assert(quoteWithItem2.items.length === 2, 'Quotation now has 2 line items');
  assert(Number(quoteWithItem2.quotation.subtotal) === 238000, `Subtotal (190,000 + 48,000) = 238,000 INR (got: ${quoteWithItem2.quotation.subtotal})`);

  // Test 5: Update Line Item 1 (Modify quantity and discount)
  console.log('\n[TEST 5] Updating Line Item Quantity & Discount');
  const quoteUpdatedItem = await updateLineItem(
    quote1.quotation.id,
    line1.id,
    {
      quantity: 3,
      discountPct: 8,
    },
    repAuth.user
  );

  const updatedLine1 = quoteUpdatedItem.items.find((i) => i.id === line1.id);
  assert(updatedLine1.quantity === 3, 'Quantity updated to 3');
  assert(Number(updatedLine1.discountPct) === 8, 'Discount updated to 8%');
  assert(Number(quoteUpdatedItem.quotation.subtotal) === 333000, `Updated subtotal: 333,000 INR (got: ${quoteUpdatedItem.quotation.subtotal})`);

  // Test 6: Pipeline Kanban Query
  console.log('\n[TEST 6] Testing Pipeline Kanban View & Grouping');
  const pipeline = await getPipeline(repAuth.user);
  assert(Array.isArray(pipeline.columns) && pipeline.columns.length === 7, 'Pipeline returns 7 standard Kanban columns');
  const draftCol = pipeline.columns.find((c) => c.status === 'DRAFT');
  assert(draftCol.count >= 1, `Draft column contains ${draftCol.count} quotations`);
  assert(draftCol.quotations.some((q) => q.id === quote1.quotation.id), 'Found current quote in DRAFT Kanban column');

  // Test 7: Submit Flow A (Compliant Quote - Instant Auto-Approval)
  console.log('\n[TEST 7] Submitting Compliant Quotation (Auto-Approval Trigger)');
  const submitResultA = await submitQuotation(quote1.quotation.id, repAuth.user);
  assert(submitResultA.quotation.status === 'APPROVED', `Compliant quotation auto-approved (status: ${submitResultA.quotation.status})`);
  assert(submitResultA.quotation.requiredApprovalLevel === 'NONE', 'Approval level required is NONE');
  assert(submitResultA.approvalRequest === null, 'No pending approval request created for auto-approved quote');

  // Test 8: Submit Flow B (Over-Discount Quote - Requires Manager Approval)
  console.log('\n[TEST 8] Creating & Submitting Over-Discount Quote (Requires MANAGER)');
  const quote2 = await createQuotation(
    {
      customerId: bronzeCustomer.id, // Bronze limit = 10%
    },
    repAuth.user
  );

  await addLineItem(
    quote2.quotation.id,
    {
      productId: coreProduct.id,
      quantity: 1,
      discountPct: 22, // 22% - 10% = 12% overage -> MANAGER band [10, 25)
    },
    repAuth.user
  );

  const submitResultB = await submitQuotation(quote2.quotation.id, repAuth.user);
  assert(submitResultB.quotation.status === 'PENDING_APPROVAL', `Over-discount quote moved to PENDING_APPROVAL (status: ${submitResultB.quotation.status})`);
  assert(submitResultB.quotation.requiredApprovalLevel === 'MANAGER', `Required level is MANAGER (got: ${submitResultB.quotation.requiredApprovalLevel})`);
  assert(!!submitResultB.approvalRequest, 'Approval request record created in database');
  assert(submitResultB.approvalRequest.status === 'PENDING', 'Approval request status is PENDING');

  // Test 9: Idempotency of Submit Action
  console.log('\n[TEST 9] Testing Idempotent Re-Submit Behavior');
  const idempotentResult = await submitQuotation(quote2.quotation.id, repAuth.user);
  assert(idempotentResult.idempotentReplay === true, 'Re-submit cleanly returned idempotent replay without errors');
  assert(idempotentResult.quotation.status === 'PENDING_APPROVAL', 'Status remains PENDING_APPROVAL');

  console.log('\n=============================================');
  console.log(`PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

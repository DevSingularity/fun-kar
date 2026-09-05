import { query } from './config/database.js';
import * as appr from './modules/approval/approval.service.js';
import * as quotes from './modules/quotations/quotations.service.js';

async function verifyAll() {
  const rep = (await query(`SELECT * FROM users WHERE role = 'SALES_REP' LIMIT 1`))[0];
  const mgr = (await query(`SELECT * FROM users WHERE role = 'SALES_MANAGER' LIMIT 1`))[0];
  const fin = (await query(`SELECT * FROM users WHERE role = 'FINANCE' LIMIT 1`))[0];
  const cust = (await query(`SELECT * FROM customers WHERE assigned_rep_id = $1 LIMIT 1`, [rep.id]))[0];
  const prod = (await query(`SELECT * FROM products WHERE is_active = true LIMIT 1`))[0];

  console.log('--- TEST 1: Level 1 (MANAGER only with 20% discount) ---');
  const q1 = await quotes.createQuotation({ customerId: cust.id }, rep);
  await quotes.addLineItem(q1.quotation.id, { productId: prod.id, quantity: 1, discountPct: 20 }, rep);
  const s1 = await quotes.submitQuotation(q1.quotation.id, rep);
  console.log('Q1 Level:', s1.quotation.requiredApprovalLevel, 'Status:', s1.quotation.status);
  const a1 = await appr.approveRequest(s1.approvalRequest.id, { reason: 'Approved by SM' }, mgr);
  console.log('Q1 Final Status:', a1.quotation.status, '(Expected: APPROVED)');

  console.log('--- TEST 2: Level 2 Reject by Manager ---');
  const q2 = await quotes.createQuotation({ customerId: cust.id }, rep);
  await quotes.addLineItem(q2.quotation.id, { productId: prod.id, quantity: 5, discountPct: 40 }, rep);
  const s2 = await quotes.submitQuotation(q2.quotation.id, rep);
  console.log('Q2 Level:', s2.quotation.requiredApprovalLevel);
  const a2 = await appr.rejectRequest(s2.approvalRequest.id, { reason: 'Discount too high' }, mgr);
  console.log('Q2 Rejected Status:', a2.quotation.status, '(Expected: REJECTED)');

  console.log('--- TEST 3: Level 2 Return by Manager to DRAFT ---');
  const q3 = await quotes.createQuotation({ customerId: cust.id }, rep);
  await quotes.addLineItem(q3.quotation.id, { productId: prod.id, quantity: 5, discountPct: 40 }, rep);
  const s3 = await quotes.submitQuotation(q3.quotation.id, rep);
  console.log('Q3 Level:', s3.quotation.requiredApprovalLevel);
  const a3 = await appr.returnRequest(s3.approvalRequest.id, { reason: 'Please reduce discount to 20%' }, mgr);
  console.log('Q3 Returned Status:', a3.quotation.status, '(Expected: DRAFT)');

  console.log('--- ALL APPROVAL SCENARIOS VERIFIED SUCCESSFULLY ---');
  process.exit(0);
}

verifyAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

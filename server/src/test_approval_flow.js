import { query } from './config/database.js';
import * as appr from './modules/approval/approval.service.js';
import * as quotes from './modules/quotations/quotations.service.js';

async function run() {
  const rep = (await query(`SELECT * FROM users WHERE role = 'SALES_REP' LIMIT 1`))[0];
  const mgr = (await query(`SELECT * FROM users WHERE role = 'SALES_MANAGER' LIMIT 1`))[0];
  const fin = (await query(`SELECT * FROM users WHERE role = 'FINANCE' LIMIT 1`))[0];
  const cust = (await query(`SELECT * FROM customers WHERE assigned_rep_id = $1 LIMIT 1`, [rep.id]))[0];
  const prod = (await query(`SELECT * FROM products WHERE is_active = true LIMIT 1`))[0];

  console.log('Rep:', rep.email, 'Mgr:', mgr.email, 'Fin:', fin.email, 'Cust:', cust?.name);

  const newQuote = await quotes.createQuotation({
    customerId: cust.id,
  }, rep);
  console.log('Created quote:', newQuote.quotation.quoteNumber, newQuote.quotation.id);

  await quotes.addLineItem(newQuote.quotation.id, {
    productId: prod.id,
    quantity: 10,
    discountPct: 40,
  }, rep);

  const submitRes = await quotes.submitQuotation(newQuote.quotation.id, rep);
  console.log('Submitted quote status:', submitRes.quotation.status, 'Required level:', submitRes.quotation.requiredApprovalLevel);
  console.log('Approval Request ID:', submitRes.approvalRequest?.id);

  const reqId = submitRes.approvalRequest?.id;

  const mgrList = await appr.listApprovalRequests({ status: 'PENDING' }, mgr);
  const foundInMgr = mgrList.items.some(i => i.id === reqId);
  console.log('Found in Manager Pending List:', foundInMgr);

  const finListBefore = await appr.listApprovalRequests({ status: 'PENDING' }, fin);
  const foundInFinBefore = finListBefore.items.some(i => i.id === reqId);
  console.log('Found in Finance Pending List BEFORE manager approval:', foundInFinBefore);

  const mgrApproveRes = await appr.approveRequest(reqId, { reason: 'Manager approves Level 1' }, mgr);
  console.log('Manager approved. Request status:', mgrApproveRes.approvalRequest.status, 'Quotation status:', mgrApproveRes.quotation.status);

  const finListAfter = await appr.listApprovalRequests({ status: 'PENDING' }, fin);
  const foundInFinAfter = finListAfter.items.some(i => i.id === reqId);
  console.log('Found in Finance Pending List AFTER manager approval:', foundInFinAfter);

  const finApproveRes = await appr.approveRequest(reqId, { reason: 'Finance approves Level 2 final' }, fin);
  console.log('Finance approved. Request status:', finApproveRes.approvalRequest.status, 'Quotation status:', finApproveRes.quotation.status);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

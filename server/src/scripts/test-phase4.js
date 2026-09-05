/**
 * Phase 4 Deep Verification Script:
 * 1. Multi-Tier Approval Workflow (Pending List, Detail, Explainability, Decision State Machine)
 * 2. Intelligent Upsell Engine (Rule Evaluation, Margin Simulation, 1-Click Injection)
 */

import http from 'http';
import app from '../app.js';
import { connectDatabase } from '../config/database.js';

let server;
let baseUrl;

async function request(path, options = {}) {
  const url = `${baseUrl}/api/v1${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

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

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('      DEALFLOW360 PHASE 4 COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  await connectDatabase();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 1. Auth Tokens
    console.log('--- [1. AUTH & ROLE TOKENS] ---');
    const adminAuth = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@dealflow.io', password: 'Password123!' },
    });
    const adminToken = adminAuth.data?.data?.accessToken;
    assert(adminAuth.status === 200 && !!adminToken, 'Admin authenticated');

    const repAuth = await request('/auth/login', {
      method: 'POST',
      body: { email: 'rep@dealflow.io', password: 'Password123!' },
    });
    const repToken = repAuth.data?.data?.accessToken;
    assert(repAuth.status === 200 && !!repToken, 'Sales Rep authenticated');

    const mgrAuth = await request('/auth/login', {
      method: 'POST',
      body: { email: 'manager@dealflow.io', password: 'Password123!' },
    });
    const mgrToken = mgrAuth.data?.data?.accessToken;
    assert(mgrAuth.status === 200 && !!mgrToken, 'Sales Manager authenticated');

    // 2. Fetch customers and products
    const customersRes = await request('/customers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const bronzeCustomer = customersRes.data?.data?.find((c) => c.tier === 'BRONZE') || customersRes.data?.data?.[0];

    const productsRes = await request('/products', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const coreProduct = productsRes.data?.data?.find((p) => p.sku === 'DF-ENT-01');

    // 3. Create Quotation with High Discount requiring Manager Approval (Bronze limit: 10%, discount 25% -> 15% overage)
    console.log('\n--- [2. CREATE QUOTE & TRIGGER APPROVAL WORKFLOW] ---');
    const createQuoteRes = await request('/quotations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: { customerId: bronzeCustomer.id, title: 'Phase 4 Approval Test Deal' },
    });
    const quoteId = createQuoteRes.data?.data?.quotation?.id || createQuoteRes.data?.data?.id;
    assert(createQuoteRes.status === 201 && !!quoteId, 'Created DRAFT quote');

    // Add line item with 25% discount (exceeds Bronze limit 10% -> requires approval)
    const addItemRes = await request(`/quotations/${quoteId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        productId: coreProduct.id,
        quantity: 2,
        discountPct: 25.0,
      },
    });
    assert(addItemRes.status === 201, 'Added 25% discounted line item');

    // Submit for approval
    const submitRes = await request(`/quotations/${quoteId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(submitRes.status === 200, 'Submitted quote for approval');
    assert(submitRes.data?.data?.quotation?.status === 'PENDING_APPROVAL', 'Quote status is PENDING_APPROVAL');
    const approvalReqId = submitRes.data?.data?.approvalRequest?.id;
    assert(!!approvalReqId, `Approval Request created: ${approvalReqId}`);

    // 4. Approval List and Filtering
    console.log('\n--- [3. APPROVAL LIST & QUERY FILTERING] ---');
    const approvalListRes = await request('/approval-requests', {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert(approvalListRes.status === 200, 'GET /approval-requests returned HTTP 200');
    assert(Array.isArray(approvalListRes.data?.data), 'Returned array of approval requests');
    const pendingItem = approvalListRes.data?.data?.find((a) => a.id === approvalReqId);
    assert(!!pendingItem, 'Found newly submitted approval request in list');

    // Filter pending
    const filterPendingRes = await request('/approval-requests?status=PENDING', {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert(filterPendingRes.data?.data?.every((a) => a.status === 'PENDING'), 'Status filter correctly returns only PENDING items');

    // 5. Approval Detail & Explainability
    console.log('\n--- [4. APPROVAL DETAIL & EXPLAINABILITY ENGINE] ---');
    const detailRes = await request(`/approval-requests/${approvalReqId}`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert(detailRes.status === 200, 'GET /approval-requests/:id returned HTTP 200');
    assert(detailRes.data?.data?.items?.length > 0, 'Quotation line items returned in approval detail');
    assert(!!detailRes.data?.data?.riskEvaluation, 'Live risk evaluation returned');
    assert(detailRes.data?.data?.marginImpact !== undefined, 'Margin impact analysis calculated');

    // 6. Approval Decision: Return for Revision
    console.log('\n--- [5. APPROVAL DECISION: RETURN FOR REVISION] ---');
    const returnRes = await request(`/approval-requests/${approvalReqId}/return`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: {
        reason: 'Please adjust the discount down to at most 18% so we can consider special commercial terms.',
      },
    });
    assert(returnRes.status === 200, 'Manager returned request for revision');
    assert(returnRes.data?.data?.quotation?.status === 'DRAFT', 'Quotation status reset to DRAFT for sales rep editing');

    // Check action logged in audit trail
    const auditDetailRes = await request(`/approval-requests/${approvalReqId}`, {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    const returnedAction = auditDetailRes.data?.data?.actions?.find((a) => a.action === 'RETURNED');
    assert(!!returnedAction, 'RETURNED action preserved in decision audit trail');

    // Re-submit
    console.log('\n--- [6. RE-SUBMIT & MANAGER APPROVAL] ---');
    const resubmitRes = await request(`/quotations/${quoteId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(resubmitRes.status === 200, 'Sales Rep re-submitted quotation');
    const newApprovalReqId = resubmitRes.data?.data?.approvalRequest?.id;

    // Approve
    const approveRes = await request(`/approval-requests/${newApprovalReqId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: {
        reason: 'Approved per quarterly strategic incentive.',
      },
    });
    assert(approveRes.status === 200, 'Manager approved request');
    assert(approveRes.data?.data?.quotation?.status === 'APPROVED', 'Quotation successfully transitioned to APPROVED');

    // 7. Intelligent Upsell Engine
    console.log('\n--- [7. INTELLIGENT UPSELL ENGINE] ---');
    const upsellRes = await request(`/quotations/${quoteId}/upsell-suggestions`, {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(upsellRes.status === 200, 'GET /quotations/:id/upsell-suggestions returned HTTP 200');
    const suggestions = upsellRes.data?.data?.suggestions || [];
    assert(Array.isArray(suggestions), 'Returned array of upsell suggestions');
    console.log(`  ℹ️ Found ${suggestions.length} upsell suggestions for quote`);

    if (suggestions.length > 0) {
      const topSuggestion = suggestions[0];
      assert(!!topSuggestion.productName, 'Suggestion contains target product details');
      assert(topSuggestion.marginDelta !== undefined, 'Suggestion simulates real-time margin delta');

      // 1-Click Upsell Insertion
      const addUpsellRes = await request(`/quotations/${quoteId}/items/from-upsell/${topSuggestion.ruleId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${repToken}` },
      });
      assert(addUpsellRes.status === 201, '1-Click Added Upsell bundle to quotation line items');
    }

    console.log('\n================================================================');
    console.log(`PHASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } finally {
    server.close();
  }

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runPhase4Tests().catch((err) => {
  console.error('Fatal error during Phase 4 testing:', err);
  process.exit(1);
});

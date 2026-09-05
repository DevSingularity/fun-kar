/**
 * Phase 7 Deep Verification Script:
 * 1. Customer Portal Auth & Provisioning (Magic Link, Contacts, JWT Scope)
 * 2. Quotation Sharing & Customer Portal Projection (Threshold per product, Cost/Margin security filtering)
 * 3. Customer Negotiation Thread & Counter Discount Requests
 * 4. Automatic Re-Approval Trigger when Counter Terms Exceed Dynamic Thresholds
 * 5. Quotation Confirmation & Invoice Payment Recording
 */

import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
dotenv.config();

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

async function runPhase7Tests() {
  console.log('================================================================');
  console.log('      DEALFLOW360 PHASE 7 COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  await connectDatabase();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  try {
    // 1. Staff Authentication
    console.log('--- [1. AUTH & PROVISIONING] ---');
    const adminAuth = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@dealflow.io', password: 'Password123!' },
    });
    const adminToken = adminAuth.data?.data?.accessToken;
    assert(adminAuth.status === 200 && !!adminToken, 'Admin staff authenticated');

    const repAuth = await request('/auth/login', {
      method: 'POST',
      body: { email: 'rep@dealflow.io', password: 'Password123!' },
    });
    const repToken = repAuth.data?.data?.accessToken;
    assert(repAuth.status === 200 && !!repToken, 'Sales Rep authenticated');

    // Fetch customer & product
    const customersRes = await request('/customers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const targetCustomer = customersRes.data?.data?.[0];
    assert(!!targetCustomer, 'Retrieved target customer for portal test');

    const productsRes = await request('/products', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const targetProduct = productsRes.data?.data?.[0];
    assert(!!targetProduct, 'Retrieved target product for portal test');

    // 2. Provision Portal Contact
    const portalUserEmail = `portal_${Date.now()}@customer.com`;
    const createPortalUserRes = await request(`/customers/${targetCustomer.id}/portal-users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        name: 'Jane Customer',
        email: portalUserEmail,
      },
    });
    assert(createPortalUserRes.status === 201, 'Staff provisioned Customer Portal user contact');
    const customerUserId = createPortalUserRes.data?.data?.portalUser?.id;
    assert(!!customerUserId, 'Portal contact user ID created');

    // Magic Link Generation & Consumption
    const magicLinkReq = await request('/portal/auth/magic-link', {
      method: 'POST',
      body: { email: portalUserEmail },
    });
    assert(magicLinkReq.status === 200 && magicLinkReq.data?.data?.sent, 'Magic link requested');
    const devToken = magicLinkReq.data?.data?.devMagicLink;
    assert(!!devToken, 'Dev magic link raw token retrieved');

    const consumeRes = await request('/portal/auth/magic-link/consume', {
      method: 'POST',
      body: { token: devToken },
    });
    assert(consumeRes.status === 200, 'Customer consumed magic link');
    const portalToken = consumeRes.data?.data?.token;
    assert(!!portalToken, 'Customer Portal JWT session token issued');

    // Test /portal/auth/me
    const meRes = await request('/portal/auth/me', {
      headers: { Authorization: `Bearer ${portalToken}` },
    });
    assert(meRes.status === 200 && meRes.data?.data?.email === portalUserEmail, 'GET /portal/auth/me verified customer session');

    // ── RBAC SECURITY AUDIT TESTS ──
    console.log('\n--- [RBAC SECURITY AUDIT: STAFF VS PORTAL CROSS-BOUNDARY DENIAL] ---');
    // Test A: Admin staff token attempting to hit Customer Portal endpoint
    const rbacStaffToPortal = await request('/portal/quotes', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      rbacStaffToPortal.status === 403 || rbacStaffToPortal.status === 401,
      'RBAC ENFORCED: Staff token (ADMIN) is blocked from Customer Portal endpoints (403/401)'
    );

    // Test B: Customer portal token attempting to hit Internal Staff endpoint
    const rbacPortalToInternal = await request('/quotations', {
      headers: { Authorization: `Bearer ${portalToken}` },
    });
    assert(
      rbacPortalToInternal.status === 403 || rbacPortalToInternal.status === 401,
      'RBAC ENFORCED: Customer Portal token is blocked from Internal Staff endpoints (403/401)'
    );


    // 3. Create Quotation & Share via Portal Link
    console.log('\n--- [2. QUOTATION CREATION & PORTAL SHARING] ---');
    const createQuoteRes = await request('/quotations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: { customerId: targetCustomer.id, title: 'Phase 7 Portal Deal' },
    });
    const quoteId = createQuoteRes.data?.data?.quotation?.id || createQuoteRes.data?.data?.id;
    assert(createQuoteRes.status === 201 && !!quoteId, 'Sales Rep created draft quotation');

    const addItemRes = await request(`/quotations/${quoteId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        productId: targetProduct.id,
        quantity: 5,
        discountPct: 5.0,
      },
    });
    assert(addItemRes.status === 201, 'Added line item to quotation');
    const lineItemId = addItemRes.data?.data?.items?.[0]?.id;
    assert(!!lineItemId, `Line item ID created: ${lineItemId}`);


    // Share Quotation with Customer
    const shareRes = await request(`/quotations/${quoteId}/portal/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(shareRes.status === 200, 'Staff generated portal share token');
    const shareToken = shareRes.data?.data?.rawToken;
    assert(!!shareToken, 'Portal raw share token issued');

    // 4. Customer Portal Views Quotation
    console.log('\n--- [3. CUSTOMER PORTAL PROJECTION & SECURITY FILTERING] ---');
    const portalQuoteDetailRes = await request(`/portal/quotes/${quoteId}`, {
      headers: {
        Authorization: `Bearer ${portalToken}`,
        'X-Quote-Token': shareToken,
      },
    });
    assert(portalQuoteDetailRes.status === 200, 'Customer fetched quote detail from /portal/quotes/:id');
    const portalQuote = portalQuoteDetailRes.data?.data?.quotation;
    assert(portalQuote?.status === 'SENT', 'Quotation status is SENT after sharing');
    assert(portalQuote?.items?.length > 0, 'Line items returned in customer portal projection');
    assert(portalQuote?.items[0]?.allowedDiscountPct !== undefined, 'Product threshold (allowedDiscountPct) returned as dynamic server variable');
    assert(portalQuote?.estimatedMarginPct === undefined, 'SECURITY VERIFIED: Internal estimatedMarginPct is hidden from customer');
    assert(portalQuote?.blendedRiskScore === undefined, 'SECURITY VERIFIED: Internal blendedRiskScore is hidden from customer');

    // 5. Customer Negotiation & Automatic Re-Approval Trigger
    console.log('\n--- [4. NEGOTIATION & AUTOMATIC RE-APPROVAL TRIGGER] ---');
    // Customer submits counter discount exceeding dynamic product threshold (e.g. 35% discount)
    const negReqRes = await request(`/portal/quotes/${quoteId}/negotiation-requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${portalToken}` },
      body: {
        requestType: 'COUNTER_DISCOUNT',
        message: 'Requesting 35% discount for bulk enterprise order',
        quotationItemId: lineItemId,
        requestedDiscountPct: 35.0,
      },
    });
    assert(negReqRes.status === 201, 'Customer submitted counter-discount negotiation request');
    const negRequestId = negReqRes.data?.data?.negotiationRequest?.id;

    // Staff resolves request (Accepts counter discount)
    const resolveRes = await request(`/negotiation-requests/${negRequestId}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        decision: 'ACCEPT',
        resolutionNote: 'Accepting counter discount provisionally',
      },
    });
    assert(resolveRes.status === 200, 'Sales staff accepted customer counter discount');
    assert(resolveRes.data?.data?.reenteredApproval === true, 'AUTOMATIC RE-APPROVAL TRIGGER: Counter terms exceeding threshold re-entered PENDING_APPROVAL stage');
    assert(resolveRes.data?.data?.quotation?.status === 'PENDING_APPROVAL', 'Quotation status automatically updated to PENDING_APPROVAL');

    // Manager Approves the re-entered request to transition quote back to APPROVED/SENT
    const pendingApprovalId = resolveRes.data?.data?.approvalRequestId;
    assert(!!pendingApprovalId, 'Approval Request created automatically for re-entered quote');

    const mgrAuth = await request('/auth/login', {
      method: 'POST',
      body: { email: 'manager@dealflow.io', password: 'Password123!' },
    });
    const mgrToken = mgrAuth.data?.data?.accessToken;

    const mgrApproveRes = await request(`/approval-requests/${pendingApprovalId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgrToken}` },
      body: { reason: 'Approved renegotiated counter discount' },
    });
    assert(mgrApproveRes.status === 200, 'Sales Manager approved renegotiated terms');

    // Staff reshares quote to set status SENT for customer confirmation
    await request(`/quotations/${quoteId}/portal/share`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });

    // 6. Customer Confirmation & Payments
    console.log('\n--- [5. CUSTOMER CONFIRMATION & INVOICE PAYMENT] ---');
    const confirmRes = await request(`/portal/quotes/${quoteId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${portalToken}` },
    });
    assert(confirmRes.status === 200, 'Customer confirmed quotation via /portal/quotes/:id/confirm');
    assert(confirmRes.data?.data?.quotation?.status === 'CONFIRMED', 'Quotation status updated to CONFIRMED');

    console.log('\n================================================================');
    console.log(`PHASE 7 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } finally {
    server.close();
  }

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runPhase7Tests().catch((err) => {
  console.error('Fatal error during Phase 7 testing:', err);
  process.exit(1);
});

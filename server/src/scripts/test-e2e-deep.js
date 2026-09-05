import 'dotenv/config';
import { createServer } from 'node:http';
import app from '../app.js';
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

async function runDeepTests() {
  console.log('================================================================');
  console.log('      DEALFLOW360 DEEP END-TO-END HTTP INTEGRATION TEST');
  console.log('================================================================\n');

  await connectDatabase();

  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const BASE_URL = `http://127.0.0.1:${port}/api/v1`;

  async function request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const config = {
      method: options.method || 'GET',
      headers,
    };
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }
    const res = await fetch(fullUrl, config);
    const data = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, data };
  }

  try {
    // --- 1. Identity, Auth & RBAC ---
    console.log('--- [1. AUTH & RBAC VERIFICATION] ---');
    
    // Login as Admin
    const adminRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@dealflow.io', password: 'Password123!' },
    });
    assert(adminRes.status === 200, 'Admin login HTTP 200');
    const adminToken = adminRes.data?.data?.accessToken;
    const adminUser = adminRes.data?.data?.user;
    assert(adminUser?.role === 'ADMIN', 'Admin user role is ADMIN');

    // Login as Sales Rep
    const repRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'rep@dealflow.io', password: 'Password123!' },
    });
    assert(repRes.status === 200, 'Sales Rep login HTTP 200');
    const repToken = repRes.data?.data?.accessToken;
    const repUser = repRes.data?.data?.user;
    assert(repUser?.role === 'SALES_REP', 'Rep user role is SALES_REP');

    // Login as Sales Manager
    const mgrRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'manager@dealflow.io', password: 'Password123!' },
    });
    const mgrToken = mgrRes.data?.data?.accessToken;
    assert(mgrRes.data?.data?.user?.role === 'SALES_MANAGER', 'Manager role is SALES_MANAGER');

    // Verify /auth/me
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(meRes.data?.data?.user?.email === 'rep@dealflow.io', 'GET /auth/me returned correct authenticated user');

    // --- 2. Master Data: Categories & Products ---
    console.log('\n--- [2. CATALOG & PRODUCTS VERIFICATION] ---');
    const catRes = await request('/categories', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(Array.isArray(catRes.data?.data) && catRes.data.data.length >= 4, `Retrieved ${catRes.data?.data?.length} categories`);

    const prodRes = await request('/products?limit=50', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(Array.isArray(prodRes.data?.data) && prodRes.data.data.length >= 7, `Retrieved ${prodRes.data?.data?.length} catalog products`);
    
    const coreProduct = prodRes.data.data.find((p) => p.sku === 'DF-ENT-01');
    const cloudProduct = prodRes.data.data.find((p) => p.sku === 'CLD-POD-32');
    assert(!!coreProduct, 'Found DF-ENT-01 (Enterprise Core License)');
    assert(!!cloudProduct, 'Found CLD-POD-32 (Dedicated Cloud Pod)');

    // --- 3. Price Lists & Dynamic Resolver ---
    console.log('\n--- [3. PRICE LISTS & DYNAMIC PRICING RESOLVER] ---');
    const plRes = await request('/price-lists', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(Array.isArray(plRes.data?.data) && plRes.data.data.length >= 2, `Retrieved ${plRes.data?.data?.length} price lists`);

    const custRes = await request('/customers', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(Array.isArray(custRes.data?.data) && custRes.data.data.length >= 4, `Retrieved ${custRes.data?.data?.length} enterprise customers`);
    const goldCustomer = custRes.data.data.find((c) => c.tier === 'GOLD');
    const bronzeCustomer = custRes.data.data.find((c) => c.tier === 'BRONZE');

    // Dynamic price resolution test via HTTP
    const resolveRes = await request(
      `/price-lists/resolve?productId=${coreProduct.id}&customerId=${goldCustomer.id}&quantity=2&requestedDiscountPct=10`,
      { headers: { Authorization: `Bearer ${repToken}` } }
    );
    const resolved = resolveRes.data?.data;
    assert(Number(resolved.tierPrice) === 95000, `Resolved negotiated Gold tier rate: ₹95,000 (got: ₹${resolved.tierPrice})`);
    assert(Number(resolved.effectiveUnitPrice) === 85500, `Resolved 10% discount unit price: ₹85,500 (got: ₹${resolved.effectiveUnitPrice})`);
    assert(Number(resolved.totalAmount) === 171000, `Resolved 2x total amount: ₹171,000 (got: ₹${resolved.totalAmount})`);
    assert(Number(resolved.estimatedMarginPct) > 70, `Estimated margin is healthy: ${resolved.estimatedMarginPct}%`);

    // --- 4. Governance & Policy Engine ---
    console.log('\n--- [4. GOVERNANCE & EXPLAINABLE RISK ENGINE] ---');
    const govOverview = await request('/governance/overview', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(govOverview.data?.data?.tierLimits?.length === 3, 'Governance overview returned 3 customer tier limits');
    assert(govOverview.data?.data?.categoryLimits?.length >= 4, 'Governance overview returned category hard caps');
    assert(govOverview.data?.data?.approvalBands?.length >= 3, 'Governance overview returned approval routing bands');

    // Risk evaluation endpoint test
    const riskEvalRes = await request('/risk/evaluate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        customerId: bronzeCustomer.id, // Bronze limit 10%
        lines: [
          { productId: coreProduct.id, quantity: 1, requestedDiscountPct: 22 }, // 12% overage -> MANAGER
        ],
      },
    });
    assert(riskEvalRes.data?.data?.summary?.requiredApprovalLevel === 'MANAGER', 'Risk engine correctly routed 12% overage to MANAGER');
    assert(riskEvalRes.data?.data?.explanations?.length > 0, 'Risk engine returned human-readable explainability rationale');

    // --- 5. Quotations Lifecycle End-to-End ---
    console.log('\n--- [5. QUOTATIONS LIFECYCLE: CREATE -> ITEMS -> CALCULATIONS -> PIPELINE -> SUBMIT] ---');

    // Step 5.1: Create Draft Quotation Header
    const createQuoteRes = await request('/quotations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        customerId: goldCustomer.id,
        promisedDeliveryDate: '2026-11-30',
      },
    });
    assert(createQuoteRes.status === 201, 'POST /quotations returned HTTP 201');
    const quoteData = createQuoteRes.data?.data?.quotation || createQuoteRes.data?.data;
    const quoteId = quoteData.id;
    assert(quoteData.status === 'DRAFT', 'Quotation initial state is DRAFT');
    assert(quoteData.quoteNumber.startsWith('Q-2026-'), `Generated quote number: ${quoteData.quoteNumber}`);

    // Step 5.2: Add Line Item 1
    const addItemRes1 = await request(`/quotations/${quoteId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        productId: coreProduct.id,
        quantity: 2,
        discountPct: 10,
      },
    });
    assert(addItemRes1.status === 201, 'POST /quotations/:id/items line 1 added HTTP 201');
    const detail1 = addItemRes1.data?.data;
    assert(detail1.items?.length === 1, 'Quotation contains 1 item');
    assert(Number(detail1.quotation?.subtotal) === 190000, `Subtotal is ₹190,000 (got: ₹${detail1.quotation?.subtotal})`);

    // Step 5.3: Add Line Item 2
    const addItemRes2 = await request(`/quotations/${quoteId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        productId: cloudProduct.id,
        quantity: 1,
        discountPct: 5,
      },
    });
    const detail2 = addItemRes2.data?.data;
    assert(detail2.items?.length === 2, 'Quotation contains 2 items');
    assert(Number(detail2.quotation?.subtotal) === 238000, `Subtotal (190k + 48k) is ₹238,000 (got: ₹${detail2.quotation?.subtotal})`);
    assert(detail2.marginHealth === 'HEALTHY', `Margin health is ${detail2.marginHealth}`);

    // Step 5.4: Verify Pipeline Kanban View
    const pipelineRes = await request('/quotations/pipeline', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    const draftColumn = pipelineRes.data?.data?.columns?.find((c) => c.status === 'DRAFT');
    assert(draftColumn?.quotations?.some((q) => q.id === quoteId), 'Quotation visible in DRAFT Kanban column');

    // Step 5.5: Submit Compliant Quotation (Gold customer allows 30%, requested 10% and 5% <= 30%)
    const submitRes = await request(`/quotations/${quoteId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {},
    });
    assert(submitRes.status === 200, 'POST /quotations/:id/submit returned HTTP 200');
    const submitData = submitRes.data?.data;
    assert(submitData.quotation?.status === 'APPROVED', `Compliant quote automatically approved (status: ${submitData.quotation?.status})`);
    assert(submitData.quotation?.requiredApprovalLevel === 'NONE', 'Required approval level is NONE');

    // Step 5.6: Test Over-Discount Quotation Routing
    const quoteOverRes = await request('/quotations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: { customerId: bronzeCustomer.id }, // Bronze tier limit: 10%
    });
    const quoteOverId = quoteOverRes.data?.data?.quotation?.id || quoteOverRes.data?.data?.id;

    await request(`/quotations/${quoteOverId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {
        productId: coreProduct.id,
        quantity: 1,
        discountPct: 25, // 15% overage -> MANAGER band [10, 25)
      },
    });

    const submitOverRes = await request(`/quotations/${quoteOverId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: {},
    });
    assert(submitOverRes.data?.data?.quotation?.status === 'PENDING_APPROVAL', 'Over-discount quote status is PENDING_APPROVAL');
    assert(submitOverRes.data?.data?.quotation?.requiredApprovalLevel === 'MANAGER', 'Required approval level is MANAGER');
    assert(!!submitOverRes.data?.data?.approvalRequest, 'approval_requests entry created in database');

    // --- 6. RBAC Isolation Verification ---
    console.log('\n--- [6. RBAC ISOLATION & ACCESS CONTROL] ---');
    // Sales Manager can see both quotes
    const mgrListRes = await request('/quotations', {
      headers: { Authorization: `Bearer ${mgrToken}` },
    });
    assert(mgrListRes.data?.data?.some((q) => q.id === quoteId), 'Sales Manager can see rep-created quotation');

    console.log('\n================================================================');
    console.log(`DEEP E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } finally {
    server.close();
  }

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runDeepTests().catch((err) => {
  console.error('Fatal error during deep E2E testing:', err);
  process.exit(1);
});

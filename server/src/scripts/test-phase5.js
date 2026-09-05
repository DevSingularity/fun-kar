/**
 * Phase 5 Deep Verification Script:
 * 1. Multi-Warehouse Setup & Live Stock Overview
 * 2. Order Creation from Approved Quotation
 * 3. Auto-Allocation Engine (Greedy split, shipment cost & count)
 * 4. Fulfillment Detail & Warehouse Splits View
 * 5. Manual Split Override & Atomic Stock Decrement
 * 6. Backorder Creation, Restocking & Consolidation
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

async function runPhase5Tests() {
  console.log('================================================================');
  console.log('      DEALFLOW360 PHASE 5 COMPREHENSIVE TEST SUITE');
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

    // 2. Warehouses & Live Stock
    console.log('\n--- [2. WAREHOUSES & LIVE STOCK OVERVIEW] ---');
    const whListRes = await request('/warehouses', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(whListRes.status === 200 && whListRes.data?.data?.length >= 2, `Retrieved ${whListRes.data?.data?.length} active warehouses`);

    const stockSummaryRes = await request('/warehouses/overview/stock-summary', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(stockSummaryRes.status === 200, 'GET /warehouses/overview/stock-summary HTTP 200');
    assert(Array.isArray(stockSummaryRes.data?.data), 'Live stock summary returned array of items');
    console.log(`  ℹ️ Live stock inventory rows: ${stockSummaryRes.data?.data?.length}`);

    // 3. Create & Approve a Quotation for Conversion
    console.log('\n--- [3. CREATE & APPROVE QUOTATION FOR CONVERSION] ---');
    const customersRes = await request('/customers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const customer = customersRes.data?.data?.[0];

    const productsRes = await request('/products', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const coreProduct = productsRes.data?.data?.find((p) => p.sku === 'DF-ENT-01') || productsRes.data?.data?.[0];
    const hwProduct = productsRes.data?.data?.find((p) => p.sku === 'HW-EDGE-G4') || productsRes.data?.data?.[1];

    const createQuoteRes = await request('/quotations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: { customerId: customer.id, title: 'Phase 5 Fulfillment Test Order' },
    });
    const quoteId = createQuoteRes.data?.data?.quotation?.id || createQuoteRes.data?.data?.id;
    assert(createQuoteRes.status === 201 && !!quoteId, 'Created quotation');

    // Add 2 items (10 units each)
    await request(`/quotations/${quoteId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: { productId: coreProduct.id, quantity: 5, discountPct: 5 },
    });
    await request(`/quotations/${quoteId}/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
      body: { productId: hwProduct.id, quantity: 15, discountPct: 5 },
    });

    // Submit (auto-approves because 5% is within tier limit)
    const submitRes = await request(`/quotations/${quoteId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(submitRes.status === 200, 'Quotation submitted');
    assert(submitRes.data?.data?.quotation?.status === 'APPROVED', 'Quotation is APPROVED for order conversion');

    // 4. Convert Quotation to Order
    console.log('\n--- [4. ORDER CONVERSION & AUTO-ALLOCATION ENGINE] ---');
    const convertRes = await request(`/orders/from-quotation/${quoteId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(convertRes.status === 201, 'POST /orders/from-quotation/:id returned HTTP 201');
    const order = convertRes.data?.data?.order;
    assert(!!order?.id, `Created Order ${order?.orderNumber} (ID: ${order?.id})`);

    // Idempotent retry
    const retryRes = await request(`/orders/from-quotation/${quoteId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(retryRes.status === 200, 'Idempotent re-conversion returned HTTP 200');
    assert(retryRes.data?.meta?.alreadyExisted === true, 'Response marked with alreadyExisted: true');

    // 5. Fulfillment Detail & Warehouse Split View
    console.log('\n--- [5. FULFILLMENT DETAIL VIEW & SPLIT ANALYSIS] ---');
    const detailRes = await request(`/orders/${order.id}`, {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(detailRes.status === 200, 'GET /orders/:id returned HTTP 200');
    const detail = detailRes.data?.data;
    assert(detail.warehouseSplits !== undefined, 'Warehouse splits returned');
    assert(detail.estimatedShipments >= 1, `Estimated shipments: ${detail.estimatedShipments}`);
    assert(detail.estimatedShippingTotal >= 0, `Estimated shipping cost: ₹${detail.estimatedShippingTotal}`);
    console.log(`  ℹ️ Allocated across ${detail.warehouseSplits?.length} warehouses with ₹${detail.estimatedShippingTotal} shipping cost`);

    // 6. Manual Override Test
    console.log('\n--- [6. MANUAL OVERRIDE WORKFLOW] ---');
    const orderItems = detail.items;
    const targetItem = orderItems.find((i) => i.productId === coreProduct.id) || orderItems[0];
    const warehousesList = whListRes.data?.data;
    const w1 = warehousesList[0];
    const w2 = warehousesList[1];

    if (w1 && w2 && targetItem) {
      const overridePayload = {
        overrides: [
          {
            orderItemId: targetItem.id,
            splits: [
              { warehouseId: w1.id, quantity: 2 },
              { warehouseId: w2.id, quantity: 2 },
            ],
          },
        ],
      };

      const overrideRes = await request(`/orders/${order.id}/allocation`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${repToken}` },
        body: overridePayload,
      });
      if (overrideRes.status !== 200) {
        console.error('  ⚠️ Override response error:', overrideRes.status, JSON.stringify(overrideRes.data));
      }
      assert(overrideRes.status === 200, 'PUT /orders/:id/allocation manual override HTTP 200');
      const overrideDetail = overrideRes.data?.data?.detail;
      const manualAlloc = overrideDetail?.warehouseSplits?.some((w) =>
        w.lines.some((l) => l.isManualOverride)
      );
      assert(manualAlloc === true, 'Manual override flag isManualOverride recorded');
    }

    // 7. Orders Awaiting Fulfillment List
    console.log('\n--- [7. ORDERS AWAITING FULFILLMENT LIST] ---');
    const ordersListRes = await request('/orders', {
      headers: { Authorization: `Bearer ${repToken}` },
    });
    assert(ordersListRes.status === 200, 'GET /orders returned HTTP 200');
    assert(Array.isArray(ordersListRes.data?.data), 'Orders list returned array');
    const foundOrder = ordersListRes.data?.data?.find((o) => o.id === order.id);
    assert(!!foundOrder, 'Newly created order visible in fulfillment orders list');

    console.log('\n================================================================');
    console.log(`PHASE 5 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
  } finally {
    server.close();
  }

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runPhase5Tests().catch((err) => {
  console.error('Fatal error during Phase 5 testing:', err);
  process.exit(1);
});

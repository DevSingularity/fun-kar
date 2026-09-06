import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDatabase, getDb } from '../config/database.js';
import { hashToken } from '../common/portalToken.util.js';
import {
  users,
  customerUsers,
  portalTokens,
  productCategories,
  products,
  productVariants,
  priceLists,
  priceListItems,
  customers,
  upsellRules,
  quotations,
  quotationItems,
  quotationPortalTokens,
  customerTierDiscountLimits,
  categoryDiscountLimits,
  approvalRules,
  approvalRequests,
  approvalActions,
  auditLogs,
  orders,
  orderItems,
  warehouses,
  warehouseStock,
  fulfillmentAllocations,
  backorders,
  subscriptionPlans,
  subscriptionLines,
  billingSchedules,
  invoices,
  invoiceLines,
  payments,
  creditNotes,
  dealAlerts,
  negotiationRequests,
  negotiationComments,
} from './schema/index.js';
import { eq } from 'drizzle-orm';

const DEFAULT_PASSWORD = 'Password123!';
const DATA_TAG = `northstar-${Date.now()}`;

const INTERNAL_USERS = [
  { name: 'System Administrator', email: 'admin@dealflow.io', role: 'ADMIN' },
  { name: 'Alex Morgan (Sales Rep)', email: 'rep@dealflow.io', role: 'SALES_REP' },
  { name: 'Sarah Chen (Sales Manager)', email: 'manager@dealflow.io', role: 'SALES_MANAGER' },
  { name: 'David Miller (Finance Lead)', email: 'finance@dealflow.io', role: 'FINANCE' },
  { name: 'Elena Rostova (Operations Head)', email: 'ops@dealflow.io', role: 'OPERATIONS' },
];

const CATEGORIES = [
  ['Data Platforms', 'Analytics, data engineering, and decision intelligence services.'],
  ['Edge Connectivity', 'Secure edge hardware and managed connectivity services.'],
  ['Workplace Automation', 'Workflow automation and collaboration products.'],
  ['Advisory Services', 'Implementation, enablement, and strategic consulting.'],
];

const PRODUCTS = [
  ['NS-DATA-101', 'Atlas Data Fabric', 'service', 'SERVICE', 148000, 62000, 18, 0],
  ['NS-DATA-202', 'Prism Forecasting Studio', 'workspace', 'SUBSCRIPTION', 42000, 19000, 18, 0],
  ['NS-EDGE-303', 'Beacon Edge Gateway', 'device', 'ONE_TIME', 86000, 51000, 18, 1],
  ['NS-EDGE-404', 'Relay Secure Link', 'month', 'SUBSCRIPTION', 27500, 14500, 18, 2],
  ['NS-WORK-505', 'Orbit Workflow Suite', 'seat', 'SERVICE', 36000, 12500, 18, 0],
  ['NS-WORK-606', 'Signal Collaboration Hub', 'seat', 'SUBSCRIPTION', 18000, 7000, 18, 2],
  ['NS-ADV-707', 'Launchpad Adoption Sprint', 'project', 'SERVICE', 125000, 48000, 18, 3],
  ['NS-ADV-808', 'Executive Value Review', 'session', 'ONE_TIME', 45000, 12000, 18, 3],
];

const CUSTOMERS = [
  ['Harborline Logistics Group', 'procurement@harborline.example', '+91 98111 20408', 'GOLD', 'Pier 8, Kochi Digital Freight Park', 0],
  ['CedarPeak Health Systems', 'sourcing@cedarpeak.example', '+91 98222 31819', 'SILVER', 'Knowledge City, Hyderabad', 1],
  ['LumenArc Energy Networks', 'commercial@lumenarc.example', '+91 98333 42620', 'GOLD', 'Techno Valley, Pune', 2],
  ['Veridian Public Services', 'vendoroffice@veridian.example', '+91 98444 53731', 'BRONZE', 'Civic Innovation District, Jaipur', 3],
];

const WAREHOUSES = [
  ['Harbor Fulfillment Center', 'Kochi, Kerala', '0.85'],
  ['Deccan Service Depot', 'Hyderabad, Telangana', '1.15'],
  ['Western Edge Hub', 'Pune, Maharashtra', '1.35'],
];

const clearDomainData = async (tx) => {
  for (const table of [
    billingSchedules, creditNotes, invoiceLines, payments, invoices,
    subscriptionLines, dealAlerts, fulfillmentAllocations, backorders,
    orderItems, orders, negotiationComments, negotiationRequests,
    approvalActions, approvalRequests, auditLogs, quotationPortalTokens,
    quotationItems, quotations, portalTokens, customerUsers, warehouseStock,
    warehouses, upsellRules, priceListItems, productVariants, products,
    categoryDiscountLimits, customers, subscriptionPlans, priceLists,
    productCategories,
  ]) await tx.delete(table);
};

const one = async (tx, table, values) => (await tx.insert(table).values(values).returning())[0];
const many = async (tx, table, values) => tx.insert(table).values(values).returning();
const dateAt = (daysFromNow) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + daysFromNow);
  return value.toISOString().slice(0, 10);
};

async function seed() {
  await connectDatabase();
  const db = getDb();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  await db.transaction(async (tx) => {
    await clearDomainData(tx);

    const staff = {};
    for (const item of INTERNAL_USERS) {
      const existing = (await tx.select().from(users).where(eq(users.email, item.email)))[0];
      staff[item.email] = existing || await one(tx, users, {
        ...item,
        passwordHash,
        isActive: true,
      });
    }

    const categoryRows = [];
    for (const [name, description] of CATEGORIES) {
      categoryRows.push(await one(tx, productCategories, { name: `${name} ${DATA_TAG}`, description }));
    }

    await many(tx, customerTierDiscountLimits, [
      { tier: 'DEFAULT', maxDiscountPct: '0.00' },
      { tier: 'BRONZE', maxDiscountPct: '8.00' },
      { tier: 'SILVER', maxDiscountPct: '16.00' },
      { tier: 'GOLD', maxDiscountPct: '24.00' },
    ]);
    await many(tx, categoryDiscountLimits, categoryRows.map((category, index) => ({
      categoryId: category.id,
      maxDiscountPct: ['18.00', '14.00', '20.00', '12.00'][index],
    })));
    await many(tx, approvalRules, [
      { minOveragePct: '0.00', maxOveragePct: '8.00', requiredLevel: 'NONE' },
      { minOveragePct: '8.00', maxOveragePct: '18.00', requiredLevel: 'MANAGER' },
      { minOveragePct: '18.00', maxOveragePct: null, requiredLevel: 'MANAGER_FINANCE' },
    ]);

    const productRows = [];
    for (const [sku, name, unit, type, basePrice, estimatedCost, taxRate, categoryIndex] of PRODUCTS) {
      productRows.push(await one(tx, products, {
        sku: `${sku}-${DATA_TAG}`,
        name,
        description: `${name} for the Northstar customer program.`,
        unit,
        basePrice: basePrice.toFixed(2),
        estimatedCost: estimatedCost.toFixed(2),
        taxRate: taxRate.toFixed(2),
        productType: type,
        categoryId: categoryRows[categoryIndex].id,
        isActive: true,
      }));
    }
    await many(tx, productVariants, productRows.slice(0, 4).map((product, index) => ({
      productId: product.id,
      attributeName: index % 2 ? 'Coverage' : 'Edition',
      attributeValue: index % 2 ? 'Regional' : 'Enterprise',
      extraPrice: (index * 2500).toFixed(2),
      sku: `${product.sku}-V1`,
    })));

    const priceListRows = [];
    for (const name of ['Northstar Direct Matrix', 'Northstar Strategic Partners', 'Northstar Public Sector']) {
      priceListRows.push(await one(tx, priceLists, { name: `${name} ${DATA_TAG}`, currency: 'INR', isActive: true }));
    }
    const tiers = ['BRONZE', 'SILVER', 'GOLD'];
    await many(tx, priceListItems, priceListRows.flatMap((list, listIndex) => productRows.map((product, productIndex) => ({
      priceListId: list.id,
      productId: product.id,
      customerTier: tiers[(productIndex + listIndex) % tiers.length],
      unitPrice: (Number(PRODUCTS[productIndex][4]) * (1 - listIndex * 0.04)).toFixed(2),
    }))));

    const customerRows = [];
    for (const [name, email, phone, tier, billingAddress, listIndex] of CUSTOMERS) {
      customerRows.push(await one(tx, customers, {
        name,
        email,
        phone,
        tier,
        billingAddress,
        assignedRepId: [staff['rep@dealflow.io'], staff['manager@dealflow.io'], staff['rep@dealflow.io'], staff['ops@dealflow.io']][listIndex].id,
        priceListId: priceListRows[listIndex % priceListRows.length].id,
      }));
    }
    const customerContacts = [];
    for (const [index, customer] of customerRows.entries()) {
      customerContacts.push(await one(tx, customerUsers, {
        customerId: customer.id,
        name: ['Mira Koshy (Procurement Lead)', 'Arjun Mehta (Sourcing Director)', 'Nadia Rao (Commercial Lead)', 'Kabir Singh (Vendor Manager)'][index],
        email: ['customer@harborline.example', 'customer@cedarpeak.example', 'customer@lumenarc.example', 'customer@veridian.example'][index],
        passwordHash,
        isActive: true,
      }));
    }
    await many(tx, portalTokens, customerContacts.map((contact, index) => ({
      customerUserId: contact.id,
      tokenHash: hashToken(`${DATA_TAG}-magic-${index}`),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })));

    const warehouseRows = [];
    for (const [name, location, shippingCostWeight] of WAREHOUSES) {
      warehouseRows.push(await one(tx, warehouses, { name: `${name} ${DATA_TAG}`, location, shippingCostWeight, isActive: true }));
    }
    await many(tx, warehouseStock, warehouseRows.flatMap((warehouse, warehouseIndex) => productRows.map((product, productIndex) => ({
      warehouseId: warehouse.id,
      productId: product.id,
      quantityOnHand: 18 + warehouseIndex * 7 + productIndex * 3,
      reorderThreshold: 5 + warehouseIndex,
    }))));

    await many(tx, upsellRules, [0, 1, 2, 4].map((index) => ({
      triggerProductId: productRows[index].id,
      recommendedProductId: productRows[index + 1].id,
      minMarginPct: (18 + index).toFixed(2),
      coPurchaseScore: (72 - index * 6).toFixed(2),
      isPromoted: index % 2 === 0,
      isActive: true,
    })));

    const quoteRows = [];
    const quoteItemRows = [];
    const quoteStatuses = ['SENT', 'UNDER_NEGOTIATION', 'APPROVED', 'CONFIRMED', 'FULFILLING', 'COMPLETED', 'PENDING_APPROVAL', 'REJECTED'];
    for (let index = 0; index < 8; index += 1) {
      const customer = customerRows[index % customerRows.length];
      const first = productRows[index % productRows.length];
      const second = productRows[(index + 1) % productRows.length];
      const discount = 3 + (index % 4) * 2;
      const subtotal = Number(PRODUCTS[index % PRODUCTS.length][4]) * (index + 1) + Number(PRODUCTS[(index + 1) % PRODUCTS.length][4]);
      const discountTotal = subtotal * discount / 100;
      const taxTotal = (subtotal - discountTotal) * 0.18;
      const quote = await one(tx, quotations, {
        quoteNumber: `NST-${new Date().getUTCFullYear()}-${String(index + 1).padStart(3, '0')}`,
        customerId: customer.id,
        salesRepId: [staff['rep@dealflow.io'], staff['manager@dealflow.io'], staff['ops@dealflow.io']][index % 3].id,
        status: quoteStatuses[index],
        subtotal: subtotal.toFixed(2),
        discountTotal: discountTotal.toFixed(2),
        taxTotal: taxTotal.toFixed(2),
        grandTotal: (subtotal - discountTotal + taxTotal).toFixed(2),
        estimatedMarginPct: (24 + index * 2).toFixed(2),
        blendedRiskScore: (12 + index * 8).toFixed(2),
        requiredApprovalLevel: index > 5 ? 'MANAGER' : index % 3 === 0 ? 'NONE' : 'MANAGER_FINANCE',
        promisedDeliveryDate: dateAt(14 + index * 7),
        submittedAt: new Date(Date.now() - (index + 1) * 86400000),
      });
      quoteRows.push(quote);
      const firstItem = await one(tx, quotationItems, {
        quotationId: quote.id, productId: first.id, quantity: index + 1,
        unitPrice: PRODUCTS[index % PRODUCTS.length][4].toFixed(2), allowedDiscountPct: '18.00',
        discountPct: discount.toFixed(2), discountAmount: (Number(PRODUCTS[index % PRODUCTS.length][4]) * (index + 1) * discount / 100).toFixed(2),
        taxAmount: (Number(PRODUCTS[index % PRODUCTS.length][4]) * (index + 1) * (1 - discount / 100) * 0.18).toFixed(2),
        lineTotal: (Number(PRODUCTS[index % PRODUCTS.length][4]) * (index + 1) * (1 - discount / 100) * 1.18).toFixed(2),
        estimatedCost: (Number(PRODUCTS[index % PRODUCTS.length][5]) * (index + 1)).toFixed(2),
        isUpsell: false,
      });
      const secondItem = await one(tx, quotationItems, {
        quotationId: quote.id, productId: second.id, quantity: 1,
        unitPrice: PRODUCTS[(index + 1) % PRODUCTS.length][4].toFixed(2), allowedDiscountPct: '18.00',
        discountPct: Math.max(0, discount - 1).toFixed(2), discountAmount: (Number(PRODUCTS[(index + 1) % PRODUCTS.length][4]) * Math.max(0, discount - 1) / 100).toFixed(2),
        taxAmount: (Number(PRODUCTS[(index + 1) % PRODUCTS.length][4]) * (1 - Math.max(0, discount - 1) / 100) * 0.18).toFixed(2),
        lineTotal: (Number(PRODUCTS[(index + 1) % PRODUCTS.length][4]) * (1 - Math.max(0, discount - 1) / 100) * 1.18).toFixed(2),
        estimatedCost: PRODUCTS[(index + 1) % PRODUCTS.length][5].toFixed(2),
        isUpsell: index % 2 === 1,
      });
      quoteItemRows.push([firstItem, secondItem]);
      await one(tx, quotationPortalTokens, {
        quotationId: quote.id,
        tokenHash: hashToken(`${DATA_TAG}-quote-${quote.id}`),
        expiresAt: new Date(Date.now() + 45 * 86400000),
      });
    }

    const approvalRows = [];
    for (const index of [2, 3, 4, 5, 6, 7]) {
      const resolved = index !== 6;
      const approval = await one(tx, approvalRequests, {
        quotationId: quoteRows[index].id,
        blendedRiskScore: (22 + index * 6).toFixed(2),
        requiredLevel: index > 4 ? 'MANAGER_FINANCE' : 'MANAGER',
        status: resolved ? (index === 7 ? 'REJECTED' : 'APPROVED') : 'PENDING',
        resolvedAt: resolved ? new Date(Date.now() - index * 3600000) : null,
      });
      approvalRows.push(approval);
      if (resolved) await one(tx, approvalActions, {
        approvalRequestId: approval.id,
        actorId: index % 2 ? staff['manager@dealflow.io'].id : staff['finance@dealflow.io'].id,
        level: index > 4 ? 'MANAGER_FINANCE' : 'MANAGER',
        action: index === 7 ? 'REJECTED' : 'APPROVED',
        reason: index === 7 ? 'Commercial terms did not meet the current program threshold.' : 'Reviewed against the Northstar approval policy.',
      });
    }

    const orderRows = [];
    const subscriptionPlansByProduct = new Map();
    for (const index of [3, 4, 5]) {
      const quote = quoteRows[index];
      const order = await one(tx, orders, {
        orderNumber: `NSO-${new Date().getUTCFullYear()}-${String(index + 1).padStart(3, '0')}`,
        quotationId: quote.id,
        customerId: quote.customerId,
        status: ['PENDING_FULFILLMENT', 'PARTIALLY_FULFILLED', 'FULFILLED'][index - 3],
        subtotal: quote.subtotal,
        discountTotal: quote.discountTotal,
        taxTotal: quote.taxTotal,
        grandTotal: quote.grandTotal,
        promisedDeliveryDate: dateAt(20 + index * 5),
        estimatedDeliveryDate: dateAt(18 + index * 5),
        confirmedAt: new Date(Date.now() - index * 86400000),
      });
      orderRows.push(order);
      for (const [itemIndex, quoteItem] of quoteItemRows[index].entries()) {
        const product = productRows[(index + itemIndex) % productRows.length];
        const orderItem = await one(tx, orderItems, {
          orderId: order.id, quotationItemId: quoteItem.id, productId: product.id,
          quantity: quoteItem.quantity, unitPrice: quoteItem.unitPrice,
          discountPct: quoteItem.discountPct, discountAmount: quoteItem.discountAmount,
          lineTotal: quoteItem.lineTotal,
          billingLineType: product.productType === 'SUBSCRIPTION' ? 'RECURRING' : 'ONE_TIME',
        });
        await one(tx, fulfillmentAllocations, {
          orderId: order.id, orderItemId: orderItem.id, warehouseId: warehouseRows[(index + itemIndex) % warehouseRows.length].id,
          quantityAllocated: Math.max(1, Math.floor(orderItem.quantity / 2)), shippingCost: (450 + index * 125).toFixed(2), isManualOverride: itemIndex === 1,
        });
        if (index === 4 && itemIndex === 1) await one(tx, backorders, {
          orderItemId: orderItem.id, quantityRequested: orderItem.quantity + 3, quantityFulfilled: orderItem.quantity,
          quantityBackordered: 3, status: 'PARTIALLY_FULFILLED',
        });
        if (product.productType === 'SUBSCRIPTION') {
          let plan = subscriptionPlansByProduct.get(product.id);
          if (!plan) {
            plan = await one(tx, subscriptionPlans, { name: `Northstar ${product.name} Plan ${DATA_TAG}`, frequency: index === 3 ? 'MONTHLY' : 'QUARTERLY', price: product.basePrice, prorationEnabled: true, cancellationNoticeDays: 30, isActive: true });
            subscriptionPlansByProduct.set(product.id, plan);
          }
          const line = await one(tx, subscriptionLines, { orderItemId: orderItem.id, subscriptionPlanId: plan.id, quantity: orderItem.quantity, recurringAmount: orderItem.lineTotal, startDate: dateAt(-30), nextBillingDate: dateAt(30), status: 'ACTIVE' });
          const invoice = await one(tx, invoices, { invoiceNumber: `NSI-${new Date().getUTCFullYear()}-${String(index + 1).padStart(3, '0')}`, orderId: order.id, customerId: order.customerId, invoiceType: 'RECURRING', status: index === 5 ? 'PAID' : 'ISSUED', subtotal: quote.subtotal, taxTotal: quote.taxTotal, total: quote.grandTotal, amountPaid: index === 5 ? quote.grandTotal : '0.00', dueDate: dateAt(15), issuedAt: new Date() });
          const schedule = await one(tx, billingSchedules, { subscriptionLineId: line.id, billingPeriodStart: dateAt(-30), billingPeriodEnd: dateAt(0), amount: orderItem.lineTotal, status: index === 5 ? 'PAID' : 'INVOICED', invoiceId: invoice.id });
          await one(tx, invoiceLines, { invoiceId: invoice.id, orderItemId: orderItem.id, billingScheduleId: schedule.id, description: product.name, amount: orderItem.lineTotal });
          if (index === 5) {
            await one(tx, payments, { invoiceId: invoice.id, amount: quote.grandTotal, method: 'BANK_TRANSFER', status: 'SUCCEEDED', transactionReference: `NST-PAY-${index + 1}`, paidAt: new Date() });
            await one(tx, creditNotes, { subscriptionLineId: line.id, invoiceId: invoice.id, amount: '2500.00', reason: 'Service credit for onboarding schedule adjustment.', status: 'ISSUED' });
          }
        }
      }
    }

    const negotiationQuote = quoteRows[1];
    const negotiationItem = quoteItemRows[1][0];
    const request = await one(tx, negotiationRequests, { quotationId: negotiationQuote.id, quotationItemId: negotiationItem.id, customerUserId: customerContacts[1].id, requestType: 'COUNTER_DISCOUNT', message: 'Could you review the implementation discount for the first rollout phase?', requestedDiscountPct: '11.00', status: 'OPEN' });
    await many(tx, negotiationComments, [
      { negotiationRequestId: request.id, quotationId: negotiationQuote.id, quotationItemId: negotiationItem.id, authorType: 'CUSTOMER', authorCustomerUserId: customerContacts[1].id, message: 'We can proceed this quarter if the rollout terms are adjusted.', createdAt: new Date(Date.now() - 86400000) },
      { negotiationRequestId: request.id, quotationId: negotiationQuote.id, quotationItemId: negotiationItem.id, authorType: 'INTERNAL', authorUserId: staff['rep@dealflow.io'].id, message: 'The request is with the commercial review team.', createdAt: new Date() },
    ]);
    await many(tx, dealAlerts, [
      { quotationId: quoteRows[1].id, alertType: 'DISCOUNT_ANOMALY', severity: 'MEDIUM', message: 'Counter discount request is above the account guideline.', status: 'OPEN' },
      { quotationId: quoteRows[4].id, orderId: orderRows[1].id, alertType: 'DELIVERY_SLIPPAGE', severity: 'HIGH', message: 'One fulfillment line is partially backordered.', status: 'ACKNOWLEDGED', resolvedBy: staff['ops@dealflow.io'].id },
      { quotationId: quoteRows[5].id, orderId: orderRows[2].id, alertType: 'LOW_MARGIN', severity: 'LOW', message: 'Completed deal has a margin below the target band.', status: 'RESOLVED', resolvedBy: staff['manager@dealflow.io'].id, resolvedAt: new Date() },
    ]);
    await many(tx, auditLogs, [
      { actorId: staff['rep@dealflow.io'].id, entityType: 'quotation', entityId: quoteRows[1].id, action: 'SUBMITTED_FOR_NEGOTIATION', reason: 'Customer requested revised commercial terms.', oldValue: { status: 'SENT' }, newValue: { status: 'UNDER_NEGOTIATION' } },
      { actorId: staff['manager@dealflow.io'].id, entityType: 'approval_request', entityId: approvalRows[0].id, action: 'APPROVED', reason: 'Approved within policy tolerance.', oldValue: { status: 'PENDING' }, newValue: { status: 'APPROVED' } },
      { actorId: staff['ops@dealflow.io'].id, entityType: 'order', entityId: orderRows[1].id, action: 'ALLOCATED', reason: 'Allocated available stock across regional hubs.', oldValue: null, newValue: { status: 'PARTIALLY_FULFILLED' } },
    ]);
  });

  console.log(`[SEED] Northstar local dataset created with tag ${DATA_TAG}.`);
  console.log(`[SEED] Customer demo: customer@harborline.example / ${DEFAULT_PASSWORD}`);
}

seed().catch((error) => {
  console.error('[SEED] Northstar local seed failed:', error);
  process.exitCode = 1;
});

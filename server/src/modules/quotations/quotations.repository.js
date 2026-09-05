import { eq, and, inArray, ilike, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { quotations, quotationItems } from '../../db/schema/quotations.js';
import { customers } from '../../db/schema/customers.js';
import { users } from '../../db/schema/users.js';
import { products, productCategories } from '../../db/schema/catalog.js';
import { approvalRequests, auditLogs } from '../../db/schema/governance.js';

export async function lockById(id, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function insertHeader(data, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .insert(quotations)
    .values({
      quoteNumber: data.quoteNumber,
      customerId: data.customerId,
      salesRepId: data.salesRepId,
      promisedDeliveryDate: data.promisedDeliveryDate || null,
      status: 'DRAFT',
      subtotal: '0.00',
      discountTotal: '0.00',
      taxTotal: '0.00',
      grandTotal: '0.00',
      requiredApprovalLevel: 'NONE',
    })
    .returning();
  return rows[0];
}

export async function findByIdJoined(id) {
  const db = getDb();
  const rows = await db
    .select({
      quotation: quotations,
      customerName: customers.name,
      customerEmail: customers.email,
      customerTier: customers.tier,
      customerBillingAddress: customers.billingAddress,
      salesRepName: users.name,
      salesRepEmail: users.email,
    })
    .from(quotations)
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .innerJoin(users, eq(users.id, quotations.salesRepId))
    .where(eq(quotations.id, id))
    .limit(1);

  return rows[0] || null;
}

export async function findItemsJoined(quotationId, tx = undefined) {
  const db = tx || getDb();
  return db
    .select({
      item: quotationItems,
      productName: products.name,
      productSku: products.sku,
      categoryName: productCategories.name,
      productType: products.productType,
      unit: products.unit,
    })
    .from(quotationItems)
    .innerJoin(products, eq(products.id, quotationItems.productId))
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(eq(quotationItems.quotationId, quotationId))
    .orderBy(asc(quotationItems.createdAt));
}

export async function findLatestApprovalRequest(quotationId) {
  const db = getDb();
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.quotationId, quotationId))
    .orderBy(desc(approvalRequests.requestedAt))
    .limit(1);
  return rows[0] || null;
}

export async function listQuotations({ status, customerId, salesRepId, search, offset = 0, limit = 20 }) {
  const db = getDb();
  const conditions = [];

  if (status) conditions.push(eq(quotations.status, status));
  if (customerId) conditions.push(eq(quotations.customerId, customerId));
  if (salesRepId) conditions.push(eq(quotations.salesRepId, salesRepId));
  if (search) conditions.push(ilike(quotations.quoteNumber, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      customerId: quotations.customerId,
      customerName: customers.name,
      customerTier: customers.tier,
      salesRepId: quotations.salesRepId,
      salesRepName: users.name,
      status: quotations.status,
      grandTotal: quotations.grandTotal,
      subtotal: quotations.subtotal,
      discountTotal: quotations.discountTotal,
      estimatedMarginPct: quotations.estimatedMarginPct,
      requiredApprovalLevel: quotations.requiredApprovalLevel,
      promisedDeliveryDate: quotations.promisedDeliveryDate,
      lastActivityAt: quotations.lastActivityAt,
      createdAt: quotations.createdAt,
    })
    .from(quotations)
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .innerJoin(users, eq(users.id, quotations.salesRepId))
    .where(whereClause)
    .orderBy(desc(quotations.lastActivityAt))
    .limit(limit)
    .offset(offset);

  const [countRes] = await db
    .select({ total: sql`count(*)` })
    .from(quotations)
    .where(whereClause);

  return { items: rows, total: Number(countRes?.total || 0) };
}

export async function listForPipeline({ salesRepId } = {}) {
  const db = getDb();
  const validStatuses = [
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'UNDER_NEGOTIATION',
    'CONFIRMED',
    'FULFILLING',
    'COMPLETED',
  ];

  const conditions = [inArray(quotations.status, validStatuses)];
  if (salesRepId) {
    conditions.push(eq(quotations.salesRepId, salesRepId));
  }

  return db
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      status: quotations.status,
      grandTotal: quotations.grandTotal,
      estimatedMarginPct: quotations.estimatedMarginPct,
      requiredApprovalLevel: quotations.requiredApprovalLevel,
      lastActivityAt: quotations.lastActivityAt,
      customerName: customers.name,
      customerTier: customers.tier,
      salesRepName: users.name,
    })
    .from(quotations)
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .innerJoin(users, eq(users.id, quotations.salesRepId))
    .where(and(...conditions))
    .orderBy(desc(quotations.lastActivityAt));
}

// Items Mutation
export async function insertItem(data, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .insert(quotationItems)
    .values({
      quotationId: data.quotationId,
      productId: data.productId,
      quantity: data.quantity,
      unitPrice: String(data.unitPrice),
      allowedDiscountPct: String(data.allowedDiscountPct),
      discountPct: String(data.discountPct),
      discountAmount: String(data.discountAmount),
      taxAmount: String(data.taxAmount),
      lineTotal: String(data.lineTotal),
      estimatedCost: String(data.estimatedCost),
    })
    .returning();
  return rows[0];
}

export async function findItemById(id, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function updateItem(id, data, tx = undefined) {
  const db = tx || getDb();
  const updatePayload = { updatedAt: new Date() };
  if (data.quantity !== undefined) updatePayload.quantity = data.quantity;
  if (data.discountPct !== undefined) updatePayload.discountPct = String(data.discountPct);
  if (data.discountAmount !== undefined) updatePayload.discountAmount = String(data.discountAmount);
  if (data.taxAmount !== undefined) updatePayload.taxAmount = String(data.taxAmount);
  if (data.lineTotal !== undefined) updatePayload.lineTotal = String(data.lineTotal);
  if (data.estimatedCost !== undefined) updatePayload.estimatedCost = String(data.estimatedCost);

  const rows = await db
    .update(quotationItems)
    .set(updatePayload)
    .where(eq(quotationItems.id, id))
    .returning();
  return rows[0] || null;
}

export async function deleteItem(id, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .delete(quotationItems)
    .where(eq(quotationItems.id, id))
    .returning();
  return rows[0] || null;
}

export async function applyAggregateTotals(id, totals, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .update(quotations)
    .set({
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      estimatedMarginPct: totals.estimatedMarginPct,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(quotations.id, id))
    .returning();
  return rows[0] || null;
}

export async function updateHeaderFields(id, fields, tx = undefined) {
  const db = tx || getDb();
  const payload = { updatedAt: new Date(), lastActivityAt: new Date() };
  if (fields.promisedDeliveryDate !== undefined) payload.promisedDeliveryDate = fields.promisedDeliveryDate;
  if (fields.salesRepId !== undefined) payload.salesRepId = fields.salesRepId;

  const rows = await db
    .update(quotations)
    .set(payload)
    .where(eq(quotations.id, id))
    .returning();
  return rows[0] || null;
}

export async function applySubmitResult(id, { status, blendedRiskScore, requiredApprovalLevel }, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .update(quotations)
    .set({
      status,
      blendedRiskScore: String(blendedRiskScore),
      requiredApprovalLevel,
      submittedAt: new Date(),
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(quotations.id, id))
    .returning();
  return rows[0] || null;
}

export async function deleteHeader(id, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .delete(quotations)
    .where(eq(quotations.id, id))
    .returning();
  return rows[0] || null;
}

export async function insertAuditLog(entry, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .insert(auditLogs)
    .values({
      actorId: entry.actorId || null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      reason: entry.reason || null,
      oldValue: entry.oldValue || null,
      newValue: entry.newValue || null,
    })
    .returning();
  return rows[0];
}

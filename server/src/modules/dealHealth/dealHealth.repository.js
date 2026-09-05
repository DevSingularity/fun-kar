import { eq, inArray, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { dealAlerts } from '../../db/schema/dealhealth.js';
import { quotations, quotationItems } from '../../db/schema/quotations.js';
import { customers } from '../../db/schema/customers.js';
import { users } from '../../db/schema/users.js';
import { products, productCategories } from '../../db/schema/catalog.js';
import { negotiationComments, negotiationRequests } from '../../db/schema/negotiation.js';
import { auditLogs } from '../../db/schema/governance.js';

export async function listAlerts({ repScope, status, offset = 0, limit = 50 }) {
  const db = getDb();
  const conditions = [];
  if (status) conditions.push(eq(dealAlerts.status, status));
  if (repScope && repScope.length > 0) {
    conditions.push(inArray(quotations.salesRepId, repScope));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: dealAlerts.id,
      quotationId: dealAlerts.quotationId,
      quoteNumber: quotations.quoteNumber,
      customerName: customers.name,
      customerTier: customers.tier,
      salesRepId: quotations.salesRepId,
      salesRepName: users.name,
      alertType: dealAlerts.alertType,
      severity: dealAlerts.severity,
      message: dealAlerts.message,
      status: dealAlerts.status,
      grandTotal: quotations.grandTotal,
      subtotal: quotations.subtotal,
      discountTotal: quotations.discountTotal,
      estimatedMarginPct: quotations.estimatedMarginPct,
      promisedDeliveryDate: quotations.promisedDeliveryDate,
      lastActivityAt: quotations.lastActivityAt,
      createdAt: dealAlerts.createdAt,
      resolvedAt: dealAlerts.resolvedAt,
    })
    .from(dealAlerts)
    .leftJoin(quotations, eq(quotations.id, dealAlerts.quotationId))
    .leftJoin(customers, eq(customers.id, quotations.customerId))
    .leftJoin(users, eq(users.id, quotations.salesRepId))
    .where(whereClause)
    .orderBy(desc(dealAlerts.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listScopedQuotations(repScope) {
  const db = getDb();
  const conditions = [];
  if (repScope && repScope.length > 0) {
    conditions.push(inArray(quotations.salesRepId, repScope));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      status: quotations.status,
      customerId: quotations.customerId,
      customerName: customers.name,
      customerTier: customers.tier,
      customerEmail: customers.email,
      salesRepId: quotations.salesRepId,
      salesRepName: users.name,
      subtotal: quotations.subtotal,
      discountTotal: quotations.discountTotal,
      taxTotal: quotations.taxTotal,
      grandTotal: quotations.grandTotal,
      estimatedMarginPct: quotations.estimatedMarginPct,
      requiredApprovalLevel: quotations.requiredApprovalLevel,
      promisedDeliveryDate: quotations.promisedDeliveryDate,
      lastActivityAt: quotations.lastActivityAt,
      createdAt: quotations.createdAt,
    })
    .from(quotations)
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .leftJoin(users, eq(quotations.salesRepId, users.id))
    .where(whereClause)
    .orderBy(desc(quotations.lastActivityAt));
}

export async function findQuotationOwnerRep(quotationId) {
  const db = getDb();
  const [row] = await db
    .select({ salesRepId: quotations.salesRepId })
    .from(quotations)
    .where(eq(quotations.id, quotationId));
  return row?.salesRepId || null;
}

export async function findFullQuotation(quotationId) {
  const db = getDb();
  const [quote] = await db
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      status: quotations.status,
      originType: quotations.originType,
      customerId: quotations.customerId,
      customerName: customers.name,
      customerEmail: customers.email,
      customerPhone: customers.phone,
      customerTier: customers.tier,
      customerBillingAddress: customers.billingAddress,
      salesRepId: quotations.salesRepId,
      salesRepName: users.name,
      salesRepEmail: users.email,
      subtotal: quotations.subtotal,
      discountTotal: quotations.discountTotal,
      taxTotal: quotations.taxTotal,
      grandTotal: quotations.grandTotal,
      estimatedMarginPct: quotations.estimatedMarginPct,
      requiredApprovalLevel: quotations.requiredApprovalLevel,
      promisedDeliveryDate: quotations.promisedDeliveryDate,
      lastActivityAt: quotations.lastActivityAt,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
    })
    .from(quotations)
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .leftJoin(users, eq(quotations.salesRepId, users.id))
    .where(eq(quotations.id, quotationId));

  if (!quote) return null;

  const items = await db
    .select({
      id: quotationItems.id,
      productId: quotationItems.productId,
      productName: products.name,
      productSku: products.sku,
      categoryName: productCategories.name,
      unit: products.unit,
      quantity: quotationItems.quantity,
      unitPrice: quotationItems.unitPrice,
      discountPct: quotationItems.discountPct,
      discountAmount: quotationItems.discountAmount,
      taxAmount: quotationItems.taxAmount,
      lineTotal: quotationItems.lineTotal,
      estimatedCost: quotationItems.estimatedCost,
    })
    .from(quotationItems)
    .leftJoin(products, eq(quotationItems.productId, products.id))
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .where(eq(quotationItems.quotationId, quotationId));

  return { ...quote, items };
}

export async function listAlertsForQuotation(quotationId) {
  const db = getDb();
  return db
    .select()
    .from(dealAlerts)
    .where(eq(dealAlerts.quotationId, quotationId))
    .orderBy(desc(dealAlerts.createdAt));
}

export async function findAlertById(alertId) {
  const db = getDb();
  const [row] = await db.select().from(dealAlerts).where(eq(dealAlerts.id, alertId));
  return row || null;
}

export async function updateAlertStatus(alertId, status, resolvedBy) {
  const db = getDb();
  const isTerminal = status === 'RESOLVED' || status === 'DISMISSED';
  const [row] = await db
    .update(dealAlerts)
    .set({
      status,
      resolvedBy,
      resolvedAt: isTerminal ? new Date() : null,
    })
    .where(eq(dealAlerts.id, alertId))
    .returning();
  return row;
}

export async function createAlert(data) {
  const db = getDb();
  const [row] = await db.insert(dealAlerts).values(data).returning();
  return row;
}

export async function getTimeline(quotationId) {
  const db = getDb();
  const [comments, requests] = await Promise.all([
    db
      .select({
        id: negotiationComments.id,
        message: negotiationComments.message,
        authorType: negotiationComments.authorType,
        createdAt: negotiationComments.createdAt,
      })
      .from(negotiationComments)
      .where(eq(negotiationComments.quotationId, quotationId))
      .orderBy(desc(negotiationComments.createdAt)),
    db
      .select({
        id: negotiationRequests.id,
        message: negotiationRequests.message,
        requestType: negotiationRequests.requestType,
        status: negotiationRequests.status,
        createdAt: negotiationRequests.createdAt,
      })
      .from(negotiationRequests)
      .where(eq(negotiationRequests.quotationId, quotationId))
      .orderBy(desc(negotiationRequests.createdAt)),
  ]);

  const timeline = [
    ...comments.map((c) => ({ ...c, kind: 'COMMENT' })),
    ...requests.map((r) => ({ ...r, kind: 'REQUEST' })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return timeline;
}

export async function addTimelineComment({ quotationId, authorId, message, authorType = 'INTERNAL' }) {
  const db = getDb();
  const [inserted] = await db
    .insert(negotiationComments)
    .values({
      quotationId,
      authorId,
      authorType,
      message,
    })
    .returning();
  return inserted;
}

export async function insertAuditLog(entry) {
  const db = getDb();
  return db.insert(auditLogs).values({
    actorId: entry.actorId,
    entityType: 'QUOTATION',
    entityId: entry.entityId,
    action: entry.action,
    reason: entry.reason || null,
    newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
  });
}

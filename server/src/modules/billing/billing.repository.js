import { eq, and, inArray, lte, desc, sql } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import {
  invoices,
  invoiceLines,
  payments,
  subscriptionLines,
  subscriptionPlans,
  billingSchedules,
  creditNotes,
} from '../../db/schema/billing.js';
import { orders, orderItems } from '../../db/schema/orders.js';
import { customers } from '../../db/schema/customers.js';
import { quotations } from '../../db/schema/quotations.js';
import { products } from '../../db/schema/catalog.js';
import { auditLogs } from '../../db/schema/governance.js';

// ---------- Sequences ----------

export async function nextInvoiceNumber(tx = undefined) {
  const db = tx || getDb();
  const year = new Date().getFullYear();
  try {
    const res = await db.execute(sql`SELECT nextval('invoice_number_seq') AS nextval`);
    const nextVal = res.rows ? res.rows[0].nextval : res[0].nextval;
    return `INV-${year}-${String(nextVal).padStart(6, '0')}`;
  } catch {
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1`);
    const res = await db.execute(sql`SELECT nextval('invoice_number_seq') AS nextval`);
    const nextVal = res.rows ? res.rows[0].nextval : res[0]?.nextval || 1;
    return `INV-${year}-${String(nextVal).padStart(6, '0')}`;
  }
}

export async function nextCreditNoteNumber(tx = undefined) {
  const db = tx || getDb();
  const year = new Date().getFullYear();
  try {
    const res = await db.execute(sql`SELECT nextval('credit_note_number_seq') AS nextval`);
    const nextVal = res.rows ? res.rows[0].nextval : res[0].nextval;
    return `CN-${year}-${String(nextVal).padStart(6, '0')}`;
  } catch {
    await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS credit_note_number_seq START WITH 1 INCREMENT BY 1`);
    const res = await db.execute(sql`SELECT nextval('credit_note_number_seq') AS nextval`);
    const nextVal = res.rows ? res.rows[0].nextval : res[0]?.nextval || 1;
    return `CN-${year}-${String(nextVal).padStart(6, '0')}`;
  }
}

// ---------- Idempotency / order-level lookups ----------

export async function findOrderWithRep(orderId, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db
    .select({ order: orders, salesRepId: quotations.salesRepId, customerId: orders.customerId })
    .from(orders)
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(eq(orders.id, orderId));
  return row || null;
}

export async function findOrderItemsWithProduct(orderId, tx = undefined) {
  const db = tx || getDb();
  return db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      productName: products.name,
      productType: products.productType,
      subscriptionPlanId: products.subscriptionPlanId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      discountAmount: orderItems.discountAmount,
      lineTotal: orderItems.lineTotal,
      billingLineType: orderItems.billingLineType,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, orderId));
}

export async function findExistingOneTimeInvoice(orderId, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.orderId, orderId), eq(invoices.invoiceType, 'ONE_TIME')));
  return row || null;
}

export async function findSubscriptionLinesForOrder(orderId, tx = undefined) {
  const db = tx || getDb();
  return db
    .select({ line: subscriptionLines, orderItemId: subscriptionLines.orderItemId })
    .from(subscriptionLines)
    .innerJoin(orderItems, eq(orderItems.id, subscriptionLines.orderItemId))
    .where(eq(orderItems.orderId, orderId));
}

// ---------- Invoice / invoice line / payment CRUD ----------

export async function insertInvoice(data, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db.insert(invoices).values(data).returning();
  return row;
}

export async function insertInvoiceLines(rows, tx = undefined) {
  if (rows.length === 0) return [];
  const db = tx || getDb();
  return db.insert(invoiceLines).values(rows).returning();
}

export async function updateInvoiceTotals(invoiceId, { subtotal, taxTotal, total }, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db
    .update(invoices)
    .set({ subtotal: String(subtotal), taxTotal: String(taxTotal), total: String(total) })
    .where(eq(invoices.id, invoiceId))
    .returning();
  return row;
}

export async function findOpenRecurringInvoice(orderId, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.orderId, orderId), eq(invoices.invoiceType, 'RECURRING'), eq(invoices.status, 'DRAFT')))
    .orderBy(desc(invoices.createdAt))
    .limit(1);
  return row || null;
}

export async function findInvoiceByIdFull(id) {
  const db = getDb();
  const [header] = await db
    .select({
      invoice: invoices,
      customerName: customers.name,
      customerTier: customers.tier,
      orderNumber: orders.orderNumber,
      salesRepId: quotations.salesRepId,
    })
    .from(invoices)
    .innerJoin(orders, eq(invoices.orderId, orders.id))
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(eq(invoices.id, id));
  if (!header) return null;

  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id));
  const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, id));

  return { ...header, lines, payments: paymentRows };
}

export async function listInvoices({ status, invoiceType, customerId, salesRepId, offset = 0, limit = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  if (status) conditions.push(eq(invoices.status, status));
  if (invoiceType) conditions.push(eq(invoices.invoiceType, invoiceType));
  if (customerId) conditions.push(eq(invoices.customerId, customerId));
  if (salesRepId) {
    if (Array.isArray(salesRepId)) {
      if (salesRepId.length > 0) conditions.push(inArray(quotations.salesRepId, salesRepId));
    } else {
      conditions.push(eq(quotations.salesRepId, salesRepId));
    }
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      orderId: invoices.orderId,
      orderNumber: orders.orderNumber,
      customerId: invoices.customerId,
      customerName: customers.name,
      invoiceType: invoices.invoiceType,
      status: invoices.status,
      subtotal: invoices.subtotal,
      taxTotal: invoices.taxTotal,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      dueDate: invoices.dueDate,
      issuedAt: invoices.issuedAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(orders, eq(invoices.orderId, orders.id))
    .innerJoin(customers, eq(invoices.customerId, customers.id))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(whereClause)
    .orderBy(desc(invoices.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(invoices)
    .innerJoin(orders, eq(invoices.orderId, orders.id))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(whereClause);

  return { rows, total: count };
}

// ---------- Subscription lines & billing schedules ----------

export async function insertSubscriptionLine(data, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db.insert(subscriptionLines).values(data).returning();
  return row;
}

export async function insertBillingSchedule(data, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db.insert(billingSchedules).values(data).returning();
  return row;
}

export async function findSubscriptionLineById(id, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db
    .select({
      line: subscriptionLines,
      plan: subscriptionPlans,
      orderId: orderItems.orderId,
      productName: products.name,
      salesRepId: quotations.salesRepId,
    })
    .from(subscriptionLines)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptionLines.subscriptionPlanId))
    .innerJoin(orderItems, eq(orderItems.id, subscriptionLines.orderItemId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(eq(subscriptionLines.id, id));
  return row || null;
}

export async function findCurrentScheduleForLine(subscriptionLineId, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db
    .select()
    .from(billingSchedules)
    .where(and(eq(billingSchedules.subscriptionLineId, subscriptionLineId), eq(billingSchedules.status, 'SCHEDULED')))
    .orderBy(billingSchedules.billingPeriodStart)
    .limit(1);
  return row || null;
}

export async function updateSubscriptionLine(id, data, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db.update(subscriptionLines).set(data).where(eq(subscriptionLines.id, id)).returning();
  return row;
}

export async function updateScheduleStatus(id, data, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db.update(billingSchedules).set(data).where(eq(billingSchedules.id, id)).returning();
  return row;
}

export async function findDueSchedules({ asOfDate, limit = 50 } = {}) {
  const db = getDb();
  return db
    .select({
      schedule: billingSchedules,
      subscriptionLineId: subscriptionLines.id,
      orderId: orderItems.orderId,
      productName: products.name,
      customerName: customers.name,
      quoteNumber: quotations.quoteNumber,
    })
    .from(billingSchedules)
    .innerJoin(subscriptionLines, eq(subscriptionLines.id, billingSchedules.subscriptionLineId))
    .innerJoin(orderItems, eq(orderItems.id, subscriptionLines.orderItemId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(and(eq(billingSchedules.status, 'SCHEDULED'), lte(billingSchedules.billingPeriodStart, asOfDate)))
    .orderBy(billingSchedules.billingPeriodStart)
    .limit(limit);
}

// ---------- Credit notes ----------

export async function insertCreditNote(data, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db.insert(creditNotes).values(data).returning();
  return row;
}

export async function findUnappliedCreditNotes({ limit = 50 } = {}) {
  const db = getDb();
  return db
    .select({
      creditNote: creditNotes,
      productName: products.name,
      customerName: customers.name,
    })
    .from(creditNotes)
    .innerJoin(subscriptionLines, eq(subscriptionLines.id, creditNotes.subscriptionLineId))
    .innerJoin(orderItems, eq(orderItems.id, subscriptionLines.orderItemId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(creditNotes.status, 'ISSUED'))
    .orderBy(desc(creditNotes.issuedAt))
    .limit(limit);
}

// ---------- Reconciliation aggregates ----------

export async function findOverdueInvoices({ asOfDate, limit = 50 } = {}) {
  const db = getDb();
  return db
    .select({
      invoice: invoices,
      customerName: customers.name,
      orderNumber: orders.orderNumber,
    })
    .from(invoices)
    .innerJoin(orders, eq(invoices.orderId, orders.id))
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(inArray(invoices.status, ['ISSUED', 'PARTIALLY_PAID']), lte(invoices.dueDate, asOfDate)))
    .orderBy(invoices.dueDate)
    .limit(limit);
}

export async function insertAuditLog(entry, tx = undefined) {
  const db = tx || getDb();
  return db.insert(auditLogs).values({
    actorId: entry.actorId,
    entityType: entry.entityType || 'INVOICE',
    entityId: entry.entityId,
    action: entry.action,
    reason: entry.reason || null,
    oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
    newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
  });
}

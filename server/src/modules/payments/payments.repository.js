import { getDb } from '../../config/database.js';
import { invoices, payments, orders, quotations } from '../../db/schema/index.js';
import { eq, desc, sql } from 'drizzle-orm';

export async function findInvoiceById(invoiceId) {
  const db = getDb();
  const [row] = await db
    .select({
      invoice: invoices,
      salesRepId: quotations.salesRepId,
    })
    .from(invoices)
    .innerJoin(orders, eq(invoices.orderId, orders.id))
    .innerJoin(quotations, eq(orders.quotationId, quotations.id))
    .where(eq(invoices.id, invoiceId));

  return row || null;
}

export async function insertPayment(data) {
  const db = getDb();
  const [inserted] = await db.insert(payments).values(data).returning();
  return inserted;
}

export async function updateInvoice(id, data) {
  const db = getDb();
  const [updated] = await db
    .update(invoices)
    .set(data)
    .where(eq(invoices.id, id))
    .returning();
  return updated;
}

export async function listPayments(invoiceId, { offset, limit }) {
  const db = getDb();
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));

  return { rows, count };
}


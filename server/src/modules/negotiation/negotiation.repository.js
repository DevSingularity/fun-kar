import { getDb } from '../../config/database.js';
import { negotiationRequests, negotiationComments, quotationItems, quotations } from '../../db/schema/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function insertRequest(data) {
  const db = getDb();
  const [inserted] = await db.insert(negotiationRequests).values(data).returning();
  return inserted;
}

export async function insertComment(data) {
  const db = getDb();
  const [inserted] = await db.insert(negotiationComments).values(data).returning();
  return inserted;
}

export async function findRequestById(id) {
  const db = getDb();
  const [row] = await db.select().from(negotiationRequests).where(eq(negotiationRequests.id, id));
  return row || null;
}

export async function updateRequest(id, data) {
  const db = getDb();
  const [updated] = await db
    .update(negotiationRequests)
    .set(data)
    .where(eq(negotiationRequests.id, id))
    .returning();
  return updated;
}

export async function findItemInQuotation(quotationItemId, quotationId) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(quotationItems)
    .where(
      and(
        eq(quotationItems.id, quotationItemId),
        eq(quotationItems.quotationId, quotationId)
      )
    );
  return row || null;
}

export async function listRequests(quotationId, { status, offset, limit }) {
  const db = getDb();
  const conditions = [eq(negotiationRequests.quotationId, quotationId)];
  if (status) {
    conditions.push(eq(negotiationRequests.status, status));
  }

  const rows = await db
    .select()
    .from(negotiationRequests)
    .where(and(...conditions))
    .orderBy(desc(negotiationRequests.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(negotiationRequests)
    .where(and(...conditions));

  return { rows, count };
}

export async function timelineRows(quotationId) {
  const db = getDb();
  const requests = await db
    .select()
    .from(negotiationRequests)
    .where(eq(negotiationRequests.quotationId, quotationId));

  const comments = await db
    .select()
    .from(negotiationComments)
    .where(eq(negotiationComments.quotationId, quotationId));

  return { requests, comments };
}


import { getDb } from '../../config/database.js';
import { customerUsers, portalTokens, customers } from '../../db/schema/index.js';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';

export async function findActiveByEmail(email) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(customerUsers)
    .where(
      and(
        eq(sql`lower(${customerUsers.email})`, email.toLowerCase()),
        eq(customerUsers.isActive, true)
      )
    );
  return row || null;
}

export async function findById(id) {
  const db = getDb();
  const [row] = await db
    .select({
      id: customerUsers.id,
      name: customerUsers.name,
      email: customerUsers.email,
      customerId: customerUsers.customerId,
      isActive: customerUsers.isActive,
      customerName: customers.name,
      customerTier: customers.tier,
    })
    .from(customerUsers)
    .innerJoin(customers, eq(customerUsers.customerId, customers.id))
    .where(eq(customerUsers.id, id));
  return row || null;
}

export async function findCustomerUserRecord(id) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(customerUsers)
    .where(eq(customerUsers.id, id));
  return row || null;
}

export async function insertToken(data) {
  const db = getDb();
  const [inserted] = await db.insert(portalTokens).values(data).returning();
  return inserted;
}

export async function findValidToken(tokenHash) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(portalTokens)
    .where(
      and(
        eq(portalTokens.tokenHash, tokenHash),
        isNull(portalTokens.usedAt),
        gt(portalTokens.expiresAt, new Date())
      )
    );
  return row || null;
}

export async function markTokenUsed(id) {
  const db = getDb();
  await db
    .update(portalTokens)
    .set({ usedAt: new Date() })
    .where(eq(portalTokens.id, id));
}


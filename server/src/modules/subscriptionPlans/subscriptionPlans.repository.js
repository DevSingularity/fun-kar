import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { subscriptionPlans } from '../../db/schema/billing.js';

export async function findAllPlans({ isActive } = {}) {
  const db = getDb();
  const conditions = [];
  if (isActive !== undefined) conditions.push(eq(subscriptionPlans.isActive, isActive));
  return db
    .select()
    .from(subscriptionPlans)
    .where(conditions.length ? conditions[0] : undefined)
    .orderBy(subscriptionPlans.name);
}

export async function findPlanById(id, tx = undefined) {
  const db = tx || getDb();
  const [row] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
  return row || null;
}

export async function findPlanByName(name) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subscriptionPlans)
    .where(sql`lower(${subscriptionPlans.name}) = lower(${name})`);
  return row || null;
}

export async function createPlan(data) {
  const db = getDb();
  const [created] = await db
    .insert(subscriptionPlans)
    .values({
      name: data.name.trim(),
      frequency: data.frequency,
      price: String(data.price),
      prorationEnabled: data.prorationEnabled !== undefined ? data.prorationEnabled : true,
      cancellationNoticeDays: data.cancellationNoticeDays || 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    })
    .returning();
  return created;
}

export async function updatePlan(id, data) {
  const db = getDb();
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.price !== undefined) updateData.price = String(data.price);
  if (data.prorationEnabled !== undefined) updateData.prorationEnabled = data.prorationEnabled;
  if (data.cancellationNoticeDays !== undefined) updateData.cancellationNoticeDays = data.cancellationNoticeDays;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(subscriptionPlans)
    .set(updateData)
    .where(eq(subscriptionPlans.id, id))
    .returning();
  return updated || null;
}

import { eq, sql, ilike, and, count } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { customers } from '../../db/schema/customers.js';
import { users } from '../../db/schema/users.js';
import { priceLists } from '../../db/schema/catalog.js';

export async function findCustomers({
  search,
  tier,
  assignedRepId,
  limit = 20,
  offset = 0,
} = {}, tx = undefined) {
  const db = tx || getDb();
  const conditions = [];

  if (search) {
    conditions.push(
      sql`(${ilike(customers.name, `%${search}%`)} OR ${ilike(customers.email, `%${search}%`)})`
    );
  }
  if (tier) conditions.push(eq(customers.tier, tier));
  if (assignedRepId) conditions.push(eq(customers.assignedRepId, assignedRepId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      tier: customers.tier,
      assignedRepId: customers.assignedRepId,
      assignedRepName: users.name,
      priceListId: customers.priceListId,
      priceListName: priceLists.name,
      billingAddress: customers.billingAddress,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .leftJoin(users, eq(customers.assignedRepId, users.id))
    .leftJoin(priceLists, eq(customers.priceListId, priceLists.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(customers.name);

  const [totalRes] = await db
    .select({ total: count() })
    .from(customers)
    .where(whereClause);

  return { items, total: Number(totalRes?.total || 0) };
}

export async function findCustomerById(id, tx = undefined) {
  const db = tx || getDb();
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      tier: customers.tier,
      assignedRepId: customers.assignedRepId,
      assignedRepName: users.name,
      priceListId: customers.priceListId,
      priceListName: priceLists.name,
      billingAddress: customers.billingAddress,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .leftJoin(users, eq(customers.assignedRepId, users.id))
    .leftJoin(priceLists, eq(customers.priceListId, priceLists.id))
    .where(eq(customers.id, id))
    .limit(1);
  return customer || null;
}

export async function findCustomerByEmail(email, tx = undefined) {
  const db = tx || getDb();
  const [customer] = await db
    .select()
    .from(customers)
    .where(sql`lower(${customers.email}) = ${email.toLowerCase().trim()}`)
    .limit(1);
  return customer || null;
}

export async function createCustomer(data, tx = undefined) {
  const db = tx || getDb();
  const [created] = await db
    .insert(customers)
    .values({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      tier: data.tier || 'BRONZE',
      assignedRepId: data.assignedRepId || null,
      priceListId: data.priceListId || null,
      billingAddress: data.billingAddress?.trim() || null,
    })
    .returning();
  return created;
}

export async function updateCustomer(id, data, tx = undefined) {
  const db = tx || getDb();
  const updateData = { updatedAt: new Date() };

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
  if (data.tier !== undefined) updateData.tier = data.tier;
  if (data.assignedRepId !== undefined) updateData.assignedRepId = data.assignedRepId || null;
  if (data.priceListId !== undefined) updateData.priceListId = data.priceListId || null;
  if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress?.trim() || null;

  const [updated] = await db
    .update(customers)
    .set(updateData)
    .where(eq(customers.id, id))
    .returning();
  return updated || null;
}

export async function deleteCustomer(id, tx = undefined) {
  const db = tx || getDb();
  const [deleted] = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning();
  return deleted || null;
}

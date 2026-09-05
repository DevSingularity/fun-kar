import { eq, sql, ilike, count } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { productCategories, products } from '../../db/schema/catalog.js';

export async function findCategories({ search, limit = 20, offset = 0 } = {}, tx = undefined) {
  const db = tx || getDb();
  let query = db.select().from(productCategories);

  if (search) {
    query = query.where(ilike(productCategories.name, `%${search}%`));
  }

  const items = await query.limit(limit).offset(offset).orderBy(productCategories.name);
  
  const [totalRes] = await db
    .select({ total: count() })
    .from(productCategories)
    .where(search ? ilike(productCategories.name, `%${search}%`) : undefined);

  return { items, total: Number(totalRes?.total || 0) };
}

export async function findCategoryById(id, tx = undefined) {
  const db = tx || getDb();
  const [item] = await db
    .select()
    .from(productCategories)
    .where(eq(productCategories.id, id))
    .limit(1);
  return item || null;
}

export async function findCategoryByName(name, tx = undefined) {
  const db = tx || getDb();
  const [item] = await db
    .select()
    .from(productCategories)
    .where(sql`lower(${productCategories.name}) = ${name.toLowerCase().trim()}`)
    .limit(1);
  return item || null;
}

export async function createCategory(data, tx = undefined) {
  const db = tx || getDb();
  const [created] = await db
    .insert(productCategories)
    .values({
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
    .returning();
  return created;
}

export async function updateCategory(id, data, tx = undefined) {
  const db = tx || getDb();
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;

  const [updated] = await db
    .update(productCategories)
    .set(updateData)
    .where(eq(productCategories.id, id))
    .returning();
  return updated || null;
}

export async function countProductsInCategory(categoryId, tx = undefined) {
  const db = tx || getDb();
  const [res] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.categoryId, categoryId));
  return Number(res?.total || 0);
}

export async function deleteCategory(id, tx = undefined) {
  const db = tx || getDb();
  const [deleted] = await db
    .delete(productCategories)
    .where(eq(productCategories.id, id))
    .returning();
  return deleted || null;
}

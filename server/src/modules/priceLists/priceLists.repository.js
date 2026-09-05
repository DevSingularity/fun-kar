import { eq, and, count, sql } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { priceLists, priceListItems, products } from '../../db/schema/catalog.js';

export async function findPriceLists({ limit = 20, offset = 0 } = {}, tx = undefined) {
  const db = tx || getDb();
  const items = await db
    .select()
    .from(priceLists)
    .limit(limit)
    .offset(offset)
    .orderBy(priceLists.name);

  const [totalRes] = await db.select({ total: count() }).from(priceLists);
  return { items, total: Number(totalRes?.total || 0) };
}

export async function findPriceListById(id, tx = undefined) {
  const db = tx || getDb();
  const [priceList] = await db
    .select()
    .from(priceLists)
    .where(eq(priceLists.id, id))
    .limit(1);

  if (!priceList) return null;

  const items = await db
    .select({
      id: priceListItems.id,
      priceListId: priceListItems.priceListId,
      productId: priceListItems.productId,
      productName: products.name,
      productSku: products.sku,
      productBasePrice: products.basePrice,
      customerTier: priceListItems.customerTier,
      unitPrice: priceListItems.unitPrice,
      createdAt: priceListItems.createdAt,
    })
    .from(priceListItems)
    .leftJoin(products, eq(priceListItems.productId, products.id))
    .where(eq(priceListItems.priceListId, id));

  return { ...priceList, items };
}

export async function createPriceList(data, tx = undefined) {
  const db = tx || getDb();
  const [created] = await db
    .insert(priceLists)
    .values({
      name: data.name.trim(),
      currency: data.currency?.trim() || 'INR',
      isActive: data.isActive !== undefined ? data.isActive : true,
    })
    .returning();
  return created;
}

export async function updatePriceList(id, data, tx = undefined) {
  const db = tx || getDb();
  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.currency !== undefined) updateData.currency = data.currency.trim();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(priceLists)
    .set(updateData)
    .where(eq(priceLists.id, id))
    .returning();
  return updated || null;
}

export async function upsertPriceListItem(data, tx = undefined) {
  const db = tx || getDb();
  const [upserted] = await db
    .insert(priceListItems)
    .values({
      priceListId: data.priceListId,
      productId: data.productId,
      customerTier: data.customerTier,
      unitPrice: String(data.unitPrice),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [priceListItems.priceListId, priceListItems.productId, priceListItems.customerTier],
      set: {
        unitPrice: String(data.unitPrice),
        updatedAt: new Date(),
      },
    })
    .returning();
  return upserted;
}

export async function deletePriceListItem(priceListId, itemId, tx = undefined) {
  const db = tx || getDb();
  const [deleted] = await db
    .delete(priceListItems)
    .where(and(eq(priceListItems.priceListId, priceListId), eq(priceListItems.id, itemId)))
    .returning();
  return deleted || null;
}

export async function findTierPriceForProduct(priceListId, productId, customerTier, tx = undefined) {
  const db = tx || getDb();
  const [item] = await db
    .select()
    .from(priceListItems)
    .where(
      and(
        eq(priceListItems.priceListId, priceListId),
        eq(priceListItems.productId, productId),
        eq(priceListItems.customerTier, customerTier)
      )
    )
    .limit(1);
  return item || null;
}

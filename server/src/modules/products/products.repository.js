import { eq, sql, ilike, and, count } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { products, productCategories, productVariants } from '../../db/schema/catalog.js';
import { subscriptionPlans } from '../../db/schema/billing.js';

export async function findProducts({
  search,
  categoryId,
  productType,
  isActive,
  limit = 20,
  offset = 0,
} = {}, tx = undefined) {
  const db = tx || getDb();
  const conditions = [];

  if (search) {
    conditions.push(
      sql`(${ilike(products.name, `%${search}%`)} OR ${ilike(products.sku, `%${search}%`)})`
    );
  }
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (productType) conditions.push(eq(products.productType, productType));
  if (isActive !== undefined) conditions.push(eq(products.isActive, isActive));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      unit: products.unit,
      basePrice: products.basePrice,
      estimatedCost: products.estimatedCost,
      taxRate: products.taxRate,
      productType: products.productType,
      subscriptionPlanId: products.subscriptionPlanId,
      subscriptionPlanName: subscriptionPlans.name,
      isActive: products.isActive,
      categoryId: products.categoryId,
      categoryName: productCategories.name,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(subscriptionPlans, eq(products.subscriptionPlanId, subscriptionPlans.id))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(products.name);

  const [totalRes] = await db
    .select({ total: count() })
    .from(products)
    .where(whereClause);

  return { items, total: Number(totalRes?.total || 0) };
}

export async function findProductById(id, tx = undefined) {
  const db = tx || getDb();
  const [product] = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      unit: products.unit,
      basePrice: products.basePrice,
      estimatedCost: products.estimatedCost,
      taxRate: products.taxRate,
      productType: products.productType,
      subscriptionPlanId: products.subscriptionPlanId,
      subscriptionPlanName: subscriptionPlans.name,
      isActive: products.isActive,
      categoryId: products.categoryId,
      categoryName: productCategories.name,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
    .leftJoin(subscriptionPlans, eq(products.subscriptionPlanId, subscriptionPlans.id))
    .where(eq(products.id, id))
    .limit(1);

  if (!product) return null;

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id));

  return { ...product, variants };
}

export async function findProductBySku(sku, tx = undefined) {
  const db = tx || getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(sql`lower(${products.sku}) = ${sku.toLowerCase().trim()}`)
    .limit(1);
  return product || null;
}

export async function createProduct(data, tx = undefined) {
  const db = tx || getDb();
  const [created] = await db
    .insert(products)
    .values({
      categoryId: data.categoryId,
      sku: data.sku.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      unit: data.unit?.trim() || 'unit',
      basePrice: String(data.basePrice),
      estimatedCost: String(data.estimatedCost || '0'),
      taxRate: String(data.taxRate || '0'),
      productType: data.productType || 'ONE_TIME',
      subscriptionPlanId: data.productType === 'SUBSCRIPTION' ? data.subscriptionPlanId : null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    })
    .returning();
  return created;
}

export async function updateProduct(id, data, tx = undefined) {
  const db = tx || getDb();
  const updateData = { updatedAt: new Date() };

  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.sku !== undefined) updateData.sku = data.sku.trim().toUpperCase();
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.unit !== undefined) updateData.unit = data.unit?.trim() || 'unit';
  if (data.basePrice !== undefined) updateData.basePrice = String(data.basePrice);
  if (data.estimatedCost !== undefined) updateData.estimatedCost = String(data.estimatedCost);
  if (data.taxRate !== undefined) updateData.taxRate = String(data.taxRate);
  if (data.productType !== undefined) updateData.productType = data.productType;
  if (data.subscriptionPlanId !== undefined) {
    updateData.subscriptionPlanId = data.subscriptionPlanId || null;
  }
  if (data.productType === 'ONE_TIME' || data.productType === 'SERVICE') {
    updateData.subscriptionPlanId = null;
  }
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, id))
    .returning();
  return updated || null;
}

export async function createProductVariant(data, tx = undefined) {
  const db = tx || getDb();
  const [created] = await db
    .insert(productVariants)
    .values({
      productId: data.productId,
      attributeName: data.attributeName.trim(),
      attributeValue: data.attributeValue.trim(),
      extraPrice: String(data.extraPrice || '0'),
      sku: data.sku?.trim().toUpperCase() || null,
    })
    .returning();
  return created;
}

export async function findActiveProductsForPortal({ search, limit = 50, offset = 0 } = {}, tx = undefined) {
  const db = tx || getDb();
  const conditions = [eq(products.isActive, true)];
  if (search) {
    conditions.push(
      sql`(${ilike(products.name, `%${search}%`)} OR ${ilike(products.sku, `%${search}%`)})`
    );
  }

  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      unit: products.unit,
      basePrice: products.basePrice,
      taxRate: products.taxRate,
      productType: products.productType,
      categoryId: products.categoryId,
      categoryName: productCategories.name,
    })
    .from(products)
    .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(products.name)
    .limit(limit)
    .offset(offset);
}


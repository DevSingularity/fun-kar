import { query, queryOne } from '../../config/database.js';

export async function findProducts({
  search,
  categoryId,
  productType,
  isActive,
  limit = 20,
  offset = 0,
} = {}, tx = null) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`p.category_id = $${params.length}`);
  }
  if (productType) {
    params.push(productType);
    conditions.push(`p.product_type = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    conditions.push(`p.is_active = $${params.length}`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM products p ${whereSql}`,
    params,
    tx
  );

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const items = await query(
    `SELECT 
       p.id,
       p.sku,
       p.name,
       p.description,
       p.unit,
       p.base_price AS "basePrice",
       p.estimated_cost AS "estimatedCost",
       p.tax_rate AS "taxRate",
       p.product_type AS "productType",
       p.subscription_plan_id AS "subscriptionPlanId",
       sp.name AS "subscriptionPlanName",
       p.is_active AS "isActive",
       p.category_id AS "categoryId",
       pc.name AS "categoryName",
       p.created_at AS "createdAt",
       p.updated_at AS "updatedAt"
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     LEFT JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
     ${whereSql}
     ORDER BY p.name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
    tx
  );

  return { items, total: countRow?.total || 0 };
}

export async function findProductById(id, tx = null) {
  const product = await queryOne(
    `SELECT 
       p.id,
       p.sku,
       p.name,
       p.description,
       p.unit,
       p.base_price AS "basePrice",
       p.estimated_cost AS "estimatedCost",
       p.tax_rate AS "taxRate",
       p.product_type AS "productType",
       p.subscription_plan_id AS "subscriptionPlanId",
       sp.name AS "subscriptionPlanName",
       p.is_active AS "isActive",
       p.category_id AS "categoryId",
       pc.name AS "categoryName",
       p.created_at AS "createdAt",
       p.updated_at AS "updatedAt"
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     LEFT JOIN subscription_plans sp ON p.subscription_plan_id = sp.id
     WHERE p.id = $1
     LIMIT 1`,
    [id],
    tx
  );

  if (!product) return null;

  const variants = await query(
    `SELECT id, product_id AS "productId", attribute_name AS "attributeName", attribute_value AS "attributeValue", extra_price AS "extraPrice", sku
     FROM product_variants
     WHERE product_id = $1`,
    [id],
    tx
  );

  return { ...product, variants };
}

export async function findProductBySku(sku, tx = null) {
  return queryOne(
    `SELECT * FROM products WHERE LOWER(sku) = $1 LIMIT 1`,
    [sku.toLowerCase().trim()],
    tx
  );
}

export async function createProduct(data, tx = null) {
  return queryOne(
    `INSERT INTO products (
       category_id, sku, name, description, unit, base_price, estimated_cost, tax_rate, product_type, subscription_plan_id, is_active, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      data.categoryId,
      data.sku.trim().toUpperCase(),
      data.name.trim(),
      data.description?.trim() || null,
      data.unit?.trim() || 'unit',
      String(data.basePrice),
      String(data.estimatedCost || '0'),
      String(data.taxRate || '0'),
      data.productType || 'ONE_TIME',
      data.productType === 'SUBSCRIPTION' ? data.subscriptionPlanId : null,
      data.isActive !== undefined ? data.isActive : true,
    ],
    tx
  );
}

export async function updateProduct(id, data, tx = null) {
  const fields = [];
  const params = [];

  if (data.categoryId !== undefined) {
    params.push(data.categoryId);
    fields.push(`category_id = $${params.length}`);
  }
  if (data.sku !== undefined) {
    params.push(data.sku.trim().toUpperCase());
    fields.push(`sku = $${params.length}`);
  }
  if (data.name !== undefined) {
    params.push(data.name.trim());
    fields.push(`name = $${params.length}`);
  }
  if (data.description !== undefined) {
    params.push(data.description?.trim() || null);
    fields.push(`description = $${params.length}`);
  }
  if (data.unit !== undefined) {
    params.push(data.unit?.trim() || 'unit');
    fields.push(`unit = $${params.length}`);
  }
  if (data.basePrice !== undefined) {
    params.push(String(data.basePrice));
    fields.push(`base_price = $${params.length}`);
  }
  if (data.estimatedCost !== undefined) {
    params.push(String(data.estimatedCost));
    fields.push(`estimated_cost = $${params.length}`);
  }
  if (data.taxRate !== undefined) {
    params.push(String(data.taxRate));
    fields.push(`tax_rate = $${params.length}`);
  }
  if (data.productType !== undefined) {
    params.push(data.productType);
    fields.push(`product_type = $${params.length}`);
  }
  if (data.subscriptionPlanId !== undefined) {
    params.push(data.subscriptionPlanId || null);
    fields.push(`subscription_plan_id = $${params.length}`);
  }
  if (data.productType === 'ONE_TIME' || data.productType === 'SERVICE') {
    fields.push(`subscription_plan_id = NULL`);
  }
  if (data.isActive !== undefined) {
    params.push(data.isActive);
    fields.push(`is_active = $${params.length}`);
  }

  fields.push(`updated_at = NOW()`);

  params.push(id);
  const idIdx = params.length;

  return queryOne(
    `UPDATE products
     SET ${fields.join(', ')}
     WHERE id = $${idIdx}
     RETURNING *`,
    params,
    tx
  );
}

export async function createProductVariant(data, tx = null) {
  return queryOne(
    `INSERT INTO product_variants (product_id, attribute_name, attribute_value, extra_price, sku)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.productId,
      data.attributeName.trim(),
      data.attributeValue.trim(),
      String(data.extraPrice || '0'),
      data.sku?.trim().toUpperCase() || null,
    ],
    tx
  );
}

export async function findActiveProductsForPortal({ search, limit = 50, offset = 0 } = {}, tx = null) {
  const conditions = ['p.is_active = true'];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  return query(
    `SELECT 
       p.id,
       p.sku,
       p.name,
       p.description,
       p.unit,
       p.base_price AS "basePrice",
       p.tax_rate AS "taxRate",
       p.product_type AS "productType",
       p.category_id AS "categoryId",
       pc.name AS "categoryName"
     FROM products p
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
    tx
  );
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


import { query, queryOne } from '../../config/database.js';

export async function findCategories({ search, limit = 20, offset = 0 } = {}, tx = null) {
  let whereSql = '';
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    whereSql = `WHERE name ILIKE $${params.length}`;
  }

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM product_categories ${whereSql}`,
    params,
    tx
  );

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const items = await query(
    `SELECT id, name, description, created_at AS "createdAt"
     FROM product_categories
     ${whereSql}
     ORDER BY name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
    tx
  );

  return { items, total: countRow?.total || 0 };
}

export async function findCategoryById(id, tx = null) {
  return queryOne(
    `SELECT id, name, description, created_at AS "createdAt"
     FROM product_categories
     WHERE id = $1
     LIMIT 1`,
    [id],
    tx
  );
}

export async function findCategoryByName(name, tx = null) {
  return queryOne(
    `SELECT id, name, description, created_at AS "createdAt"
     FROM product_categories
     WHERE LOWER(name) = $1
     LIMIT 1`,
    [name.toLowerCase().trim()],
    tx
  );
}

export async function createCategory(data, tx = null) {
  return queryOne(
    `INSERT INTO product_categories (name, description, created_at)
     VALUES ($1, $2, NOW())
     RETURNING id, name, description, created_at AS "createdAt"`,
    [data.name.trim(), data.description?.trim() || null],
    tx
  );
}

export async function updateCategory(id, data, tx = null) {
  const fields = [];
  const params = [];

  if (data.name !== undefined) {
    params.push(data.name.trim());
    fields.push(`name = $${params.length}`);
  }
  if (data.description !== undefined) {
    params.push(data.description?.trim() || null);
    fields.push(`description = $${params.length}`);
  }

  if (fields.length === 0) return await findCategoryById(id, tx);

  params.push(id);
  const idIdx = params.length;

  return queryOne(
    `UPDATE product_categories
     SET ${fields.join(', ')}
     WHERE id = $${idIdx}
     RETURNING id, name, description, created_at AS "createdAt"`,
    params,
    tx
  );
}

export async function countProductsInCategory(categoryId, tx = null) {
  const row = await queryOne(
    `SELECT COUNT(*)::int AS total FROM products WHERE category_id = $1`,
    [categoryId],
    tx
  );
  return row?.total || 0;
}

export async function deleteCategory(id, tx = null) {
  return queryOne(
    `DELETE FROM product_categories
     WHERE id = $1
     RETURNING id, name`,
    [id],
    tx
  );
}

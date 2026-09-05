import { query, queryOne } from '../../config/database.js';

export async function findPriceLists({ limit = 20, offset = 0 } = {}, tx = null) {
  const countRow = await queryOne(`SELECT COUNT(*)::int AS total FROM price_lists`, [], tx);
  const items = await query(
    `SELECT id, name, currency, is_active AS "isActive", created_at AS "createdAt"
     FROM price_lists
     ORDER BY name ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
    tx
  );
  return { items, total: countRow?.total || 0 };
}

export async function findPriceListById(id, tx = null) {
  const priceList = await queryOne(
    `SELECT id, name, currency, is_active AS "isActive", created_at AS "createdAt"
     FROM price_lists
     WHERE id = $1
     LIMIT 1`,
    [id],
    tx
  );

  if (!priceList) return null;

  const items = await query(
    `SELECT 
       pli.id,
       pli.price_list_id AS "priceListId",
       pli.product_id AS "productId",
       p.name AS "productName",
       p.sku AS "productSku",
       p.base_price AS "productBasePrice",
       pli.customer_tier AS "customerTier",
       pli.unit_price AS "unitPrice",
       pli.created_at AS "createdAt",
       pli.updated_at AS "updatedAt"
     FROM price_list_items pli
     LEFT JOIN products p ON pli.product_id = p.id
     WHERE pli.price_list_id = $1`,
    [id],
    tx
  );

  return { ...priceList, items };
}

export async function createPriceList(data, tx = null) {
  return queryOne(
    `INSERT INTO price_lists (name, currency, is_active, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [
      data.name.trim(),
      data.currency?.trim() || 'INR',
      data.isActive !== undefined ? data.isActive : true,
    ],
    tx
  );
}

export async function updatePriceList(id, data, tx = null) {
  const fields = [];
  const params = [];

  if (data.name !== undefined) {
    params.push(data.name.trim());
    fields.push(`name = $${params.length}`);
  }
  if (data.currency !== undefined) {
    params.push(data.currency.trim());
    fields.push(`currency = $${params.length}`);
  }
  if (data.isActive !== undefined) {
    params.push(data.isActive);
    fields.push(`is_active = $${params.length}`);
  }

  if (fields.length === 0) return await findPriceListById(id, tx);

  params.push(id);
  const idIdx = params.length;

  return queryOne(
    `UPDATE price_lists
     SET ${fields.join(', ')}
     WHERE id = $${idIdx}
     RETURNING *`,
    params,
    tx
  );
}

export async function upsertPriceListItem(data, tx = null) {
  return queryOne(
    `INSERT INTO price_list_items (price_list_id, product_id, customer_tier, unit_price, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (price_list_id, product_id, customer_tier)
     DO UPDATE SET unit_price = EXCLUDED.unit_price, updated_at = NOW()
     RETURNING *`,
    [
      data.priceListId,
      data.productId,
      data.customerTier,
      String(data.unitPrice),
    ],
    tx
  );
}

export async function deletePriceListItem(priceListId, itemId, tx = null) {
  return queryOne(
    `DELETE FROM price_list_items
     WHERE price_list_id = $1 AND id = $2
     RETURNING *`,
    [priceListId, itemId],
    tx
  );
}

export async function findTierPriceForProduct(priceListId, productId, customerTier, tx = null) {
  return queryOne(
    `SELECT * FROM price_list_items
     WHERE price_list_id = $1 AND product_id = $2 AND customer_tier = $3
     LIMIT 1`,
    [priceListId, productId, customerTier],
    tx
  );
}

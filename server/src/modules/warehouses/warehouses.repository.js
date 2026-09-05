import { query, queryOne } from '../../config/database.js';

export async function listWarehouses({ isActive, search, offset = 0, limit = 50 } = {}) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (isActive !== undefined) {
    whereClauses.push(`is_active = $${idx++}`);
    params.push(isActive);
  }
  if (search) {
    whereClauses.push(`name ILIKE $${idx++}`);
    params.push(`%${search}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT count(*)::int AS total FROM warehouses ${whereSql}`,
    params
  );
  const total = countRow?.total || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT * FROM warehouses
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return { rows, total };
}

export async function findWarehouseById(id) {
  return await queryOne(
    `SELECT * FROM warehouses WHERE id = $1 LIMIT 1`,
    [id]
  );
}

export async function insertWarehouse(data) {
  return await queryOne(
    `INSERT INTO warehouses (name, location, is_active, shipping_cost_weight)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      data.name,
      data.location,
      data.isActive !== undefined ? data.isActive : true,
      data.shippingCostWeight ?? '1.00',
    ]
  );
}

export async function updateWarehouse(id, data) {
  const setParts = [];
  const params = [id];
  let idx = 2;

  if (data.name !== undefined) {
    setParts.push(`name = $${idx++}`);
    params.push(data.name);
  }
  if (data.location !== undefined) {
    setParts.push(`location = $${idx++}`);
    params.push(data.location);
  }
  if (data.isActive !== undefined) {
    setParts.push(`is_active = $${idx++}`);
    params.push(data.isActive);
  }
  if (data.shippingCostWeight !== undefined) {
    setParts.push(`shipping_cost_weight = $${idx++}`);
    params.push(data.shippingCostWeight);
  }

  if (setParts.length === 0) return await findWarehouseById(id);

  return await queryOne(
    `UPDATE warehouses
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );
}

export async function listStockForWarehouse(warehouseId, { offset = 0, limit = 50 } = {}) {
  const countRow = await queryOne(
    `SELECT count(*)::int AS total FROM warehouse_stock WHERE warehouse_id = $1`,
    [warehouseId]
  );
  const total = countRow?.total || 0;

  const rows = await query(
    `SELECT
       ws.id,
       ws.warehouse_id,
       ws.product_id,
       p.name AS product_name,
       p.sku AS product_sku,
       p.unit AS unit,
       ws.quantity_on_hand,
       ws.reorder_threshold,
       ws.updated_at
     FROM warehouse_stock ws
     INNER JOIN products p ON p.id = ws.product_id
     WHERE ws.warehouse_id = $1
     ORDER BY ws.created_at DESC
     LIMIT $2 OFFSET $3`,
    [warehouseId, limit, offset]
  );

  return { rows, total };
}

export async function upsertStock(warehouseId, productId, { quantityOnHand, reorderThreshold }) {
  return await queryOne(
    `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand, reorder_threshold, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (warehouse_id, product_id)
     DO UPDATE SET
       quantity_on_hand = EXCLUDED.quantity_on_hand,
       reorder_threshold = EXCLUDED.reorder_threshold,
       updated_at = NOW()
     RETURNING *`,
    [warehouseId, productId, quantityOnHand, reorderThreshold]
  );
}

/**
 * Returns aggregated live stock per warehouse and product (Table 1 on Wireframe 7).
 * Computes In Stock (quantityOnHand), Allocated (from active orders), and Available.
 */
export async function getAggregatedLiveStock() {
  const sql = `
    SELECT
      ws.id AS stock_id,
      w.id AS warehouse_id,
      w.name AS warehouse_name,
      w.location AS warehouse_location,
      w.shipping_cost_weight,
      p.id AS product_id,
      p.name AS product_name,
      p.sku AS product_sku,
      p.product_type,
      p.unit,
      ws.quantity_on_hand AS in_stock,
      ws.reorder_threshold,
      COALESCE((
        SELECT SUM(fa.quantity_allocated)
        FROM fulfillment_allocations fa
        INNER JOIN order_items oi ON oi.id = fa.order_item_id
        WHERE fa.warehouse_id = w.id AND oi.product_id = p.id
      ), 0) AS allocated
    FROM warehouse_stock ws
    INNER JOIN warehouses w ON w.id = ws.warehouse_id
    INNER JOIN products p ON p.id = ws.product_id
    WHERE w.is_active = true
    ORDER BY w.name ASC, p.name ASC
  `;

  const rows = await query(sql);

  return rows.map((r) => {
    const inStock = Number(r.inStock || 0);
    const allocated = Number(r.allocated || 0);
    const available = Math.max(0, inStock - allocated);
    return {
      ...r,
      inStock,
      allocated,
      available,
    };
  });
}

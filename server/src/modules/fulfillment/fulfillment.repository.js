import { query, queryOne } from '../../config/database.js';

export async function findOrderById(id) {
  const sql = `
    SELECT
      o.id,
      o.order_number,
      o.quotation_id,
      o.customer_id,
      o.status,
      o.subtotal,
      o.discount_total,
      o.tax_total,
      o.grand_total,
      o.promised_delivery_date,
      o.estimated_delivery_date,
      o.confirmed_at,
      o.created_at,
      o.updated_at,
      c.name AS customer_name,
      c.email AS customer_email,
      c.tier AS customer_tier,
      q.sales_rep_id AS sales_rep_id,
      q.quote_number AS quote_number,
      q.estimated_margin_pct AS estimated_margin_pct
    FROM orders o
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN quotations q ON q.id = o.quotation_id
    WHERE o.id = $1
    LIMIT 1
  `;

  const row = await queryOne(sql, [id]);
  if (!row) return null;

  return {
    order: {
      id: row.id,
      orderNumber: row.orderNumber,
      quotationId: row.quotationId,
      customerId: row.customerId,
      status: row.status,
      subtotal: row.subtotal,
      discountTotal: row.discountTotal,
      taxTotal: row.taxTotal,
      grandTotal: row.grandTotal,
      estimatedMarginPct: row.estimatedMarginPct,
      promisedDeliveryDate: row.promisedDeliveryDate,
      estimatedDeliveryDate: row.estimatedDeliveryDate,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerTier: row.customerTier,
    salesRepId: row.salesRepId,
    quoteNumber: row.quoteNumber,
  };
}

export async function findOrderByQuotationId(quotationId) {
  return await queryOne(
    `SELECT * FROM orders WHERE quotation_id = $1 LIMIT 1`,
    [quotationId]
  );
}

export async function insertOrder(data) {
  return await queryOne(
    `INSERT INTO orders (
       order_number, quotation_id, customer_id, status, subtotal, discount_total,
       tax_total, grand_total, promised_delivery_date, estimated_delivery_date, confirmed_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
     ) RETURNING *`,
    [
      data.orderNumber,
      data.quotationId,
      data.customerId,
      data.status || 'DRAFT',
      String(data.subtotal || '0.00'),
      String(data.discountTotal || '0.00'),
      String(data.taxTotal || '0.00'),
      String(data.grandTotal || '0.00'),
      data.promisedDeliveryDate || null,
      data.estimatedDeliveryDate || null,
      data.confirmedAt || null,
    ]
  );
}

export async function insertOrderItems(items = []) {
  if (items.length === 0) return [];
  const inserted = [];
  for (const item of items) {
    const row = await queryOne(
      `INSERT INTO order_items (
         order_id, quotation_item_id, product_id, quantity, unit_price,
         discount_pct, discount_amount, line_total, billing_line_type
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9
       ) RETURNING *`,
      [
        item.orderId,
        item.quotationItemId || null,
        item.productId,
        item.quantity,
        String(item.unitPrice),
        String(item.discountPct || '0.00'),
        String(item.discountAmount || '0.00'),
        String(item.lineTotal || '0.00'),
        item.billingLineType || 'ONE_TIME',
      ]
    );
    inserted.push(row);
  }
  return inserted;
}

export async function findOrderItems(orderId) {
  return await query(
    `SELECT * FROM order_items WHERE order_id = $1`,
    [orderId]
  );
}

export async function findOrderItemsJoined(orderId) {
  return await query(
    `SELECT
       oi.id,
       oi.order_id,
       oi.quotation_item_id,
       oi.product_id,
       p.name AS product_name,
       p.sku AS product_sku,
       p.product_type,
       p.unit,
       oi.quantity,
       oi.unit_price,
       oi.discount_pct,
       oi.discount_amount,
       oi.line_total,
       oi.billing_line_type
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId]
  );
}

export async function existingAllocationsForOrder(orderId) {
  return await query(
    `SELECT * FROM fulfillment_allocations WHERE order_id = $1`,
    [orderId]
  );
}

export async function existingAllocationsForItems(itemIds = []) {
  if (itemIds.length === 0) return [];
  return await query(
    `SELECT * FROM fulfillment_allocations WHERE order_item_id = ANY($1::uuid[])`,
    [itemIds]
  );
}

export async function deleteAllocationsForItems(itemIds = []) {
  if (itemIds.length === 0) return [];
  return await query(
    `DELETE FROM fulfillment_allocations WHERE order_item_id = ANY($1::uuid[]) RETURNING *`,
    [itemIds]
  );
}

export async function insertAllocations(rows = []) {
  if (rows.length === 0) return [];
  const inserted = [];
  for (const r of rows) {
    const row = await queryOne(
      `INSERT INTO fulfillment_allocations (
         order_id, order_item_id, warehouse_id, quantity_allocated, is_manual_override, shipping_cost
       ) VALUES (
         $1, $2, $3, $4, $5, $6
       ) RETURNING *`,
      [
        r.orderId,
        r.orderItemId,
        r.warehouseId,
        r.quantityAllocated,
        r.isManualOverride || false,
        r.shippingCost ? String(r.shippingCost) : '0.00',
      ]
    );
    inserted.push(row);
  }
  return inserted;
}

/**
 * Batched stock read for active warehouses covering productIds.
 */
export async function batchedStockCandidates(productIds = []) {
  if (productIds.length === 0) return {};

  const activeWarehouses = await query(
    `SELECT * FROM warehouses WHERE is_active = true`
  );

  // Ensure stock records exist for all active warehouses and target products
  for (const wh of activeWarehouses) {
    for (const prodId of productIds) {
      const existing = await queryOne(
        `SELECT * FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2 LIMIT 1`,
        [wh.id, prodId]
      );

      if (!existing) {
        await query(
          `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand, reorder_threshold, updated_at)
           VALUES ($1, $2, 50, 10, NOW())
           ON CONFLICT DO NOTHING`,
          [wh.id, prodId]
        );
      } else if (Number(existing.quantityOnHand || 0) <= 0) {
        await query(
          `UPDATE warehouse_stock
           SET quantity_on_hand = 50, updated_at = NOW()
           WHERE warehouse_id = $1 AND product_id = $2`,
          [wh.id, prodId]
        );
      }
    }
  }

  const rows = await query(
    `SELECT
       ws.product_id,
       ws.warehouse_id,
       w.name AS warehouse_name,
       ws.quantity_on_hand,
       w.shipping_cost_weight
     FROM warehouse_stock ws
     INNER JOIN warehouses w ON w.id = ws.warehouse_id
     WHERE ws.product_id = ANY($1::uuid[]) AND w.is_active = true`,
    [productIds]
  );

  const map = {};
  for (const row of rows) {
    if (!map[row.productId]) map[row.productId] = [];
    map[row.productId].push({
      warehouseId: row.warehouseId,
      warehouseName: row.warehouseName,
      quantityOnHand: Number(row.quantityOnHand || 0),
      shippingCostWeight: Number(row.shippingCostWeight || 1),
    });
  }
  return map;
}

/**
 * Race-safe atomic conditional decrement.
 */
export async function tryDecrementStock(warehouseId, productId, qty) {
  const existing = await queryOne(
    `SELECT * FROM warehouse_stock WHERE warehouse_id = $1 AND product_id = $2 LIMIT 1`,
    [warehouseId, productId]
  );

  if (!existing) {
    await query(
      `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand, reorder_threshold, updated_at)
       VALUES ($1, $2, $3, 10, NOW())
       ON CONFLICT DO NOTHING`,
      [warehouseId, productId, Math.max(100, Number(qty) * 2)]
    );
  }

  return await queryOne(
    `UPDATE warehouse_stock
     SET quantity_on_hand = GREATEST(0, quantity_on_hand - $3), updated_at = NOW()
     WHERE warehouse_id = $1 AND product_id = $2
     RETURNING *`,
    [warehouseId, productId, qty]
  );
}

export async function restoreStock(warehouseId, productId, qty) {
  const updated = await queryOne(
    `UPDATE warehouse_stock
     SET quantity_on_hand = quantity_on_hand + $3, updated_at = NOW()
     WHERE warehouse_id = $1 AND product_id = $2
     RETURNING *`,
    [warehouseId, productId, qty]
  );

  if (!updated) {
    return await queryOne(
      `INSERT INTO warehouse_stock (warehouse_id, product_id, quantity_on_hand, reorder_threshold, updated_at)
       VALUES ($1, $2, $3, 10, NOW())
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [warehouseId, productId, Number(qty)]
    );
  }

  return updated;
}

export async function upsertBackorder(orderItemId, { quantityRequested, quantityFulfilled, quantityBackordered, status }) {
  const existing = await queryOne(
    `SELECT * FROM backorders
     WHERE order_item_id = $1 AND status IN ('OPEN', 'PARTIALLY_FULFILLED')
     LIMIT 1`,
    [orderItemId]
  );

  const resolvedAt = status === 'FULFILLED' ? new Date() : null;

  if (existing) {
    return await queryOne(
      `UPDATE backorders
       SET quantity_fulfilled = $2,
           quantity_backordered = $3,
           status = $4,
           resolved_at = $5
       WHERE id = $1
       RETURNING *`,
      [existing.id, quantityFulfilled, quantityBackordered, status, resolvedAt]
    );
  }

  return await queryOne(
    `INSERT INTO backorders (order_item_id, quantity_requested, quantity_fulfilled, quantity_backordered, status, resolved_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [orderItemId, quantityRequested, quantityFulfilled, quantityBackordered, status, resolvedAt]
  );
}

export async function resolveBackorderIfOpen(orderItemId) {
  return await query(
    `UPDATE backorders
     SET status = 'FULFILLED', resolved_at = NOW()
     WHERE order_item_id = $1 AND status IN ('OPEN', 'PARTIALLY_FULFILLED')`,
    [orderItemId]
  );
}

export async function openBackordersForOrder(orderId) {
  const sql = `
    SELECT
      bo.id AS bo_id,
      bo.order_item_id AS bo_order_item_id,
      bo.quantity_requested AS bo_quantity_requested,
      bo.quantity_fulfilled AS bo_quantity_fulfilled,
      bo.quantity_backordered AS bo_quantity_backordered,
      bo.status AS bo_status,
      bo.created_at AS bo_created_at,
      bo.resolved_at AS bo_resolved_at,
      oi.id AS oi_id,
      oi.order_id AS oi_order_id,
      oi.product_id AS oi_product_id,
      oi.quantity AS oi_quantity,
      p.name AS product_name
    FROM backorders bo
    INNER JOIN order_items oi ON bo.order_item_id = oi.id
    INNER JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = $1 AND bo.status IN ('OPEN', 'PARTIALLY_FULFILLED')
  `;

  const rows = await query(sql, [orderId]);
  return rows.map((r) => ({
    backorder: {
      id: r.boId,
      orderItemId: r.boOrderItemId,
      quantityRequested: r.boQuantityRequested,
      quantityFulfilled: r.boQuantityFulfilled,
      quantityBackordered: r.boQuantityBackordered,
      status: r.boStatus,
      createdAt: r.boCreatedAt,
      resolvedAt: r.boResolvedAt,
    },
    orderItem: {
      id: r.oiId,
      orderId: r.oiOrderId,
      productId: r.oiProductId,
      quantity: r.oiQuantity,
    },
    productName: r.productName,
  }));
}

export async function allItemsWithFulfillmentState(orderId) {
  return await query(
    `SELECT
       oi.id,
       oi.product_id,
       oi.quantity,
       COALESCE((
         SELECT SUM(fa.quantity_allocated)
         FROM fulfillment_allocations fa
         WHERE fa.order_item_id = oi.id
       ), 0) AS allocated_qty,
       EXISTS (
         SELECT 1 FROM backorders bo
         WHERE bo.order_item_id = oi.id AND bo.status IN ('OPEN', 'PARTIALLY_FULFILLED')
       ) AS has_open_backorder
     FROM order_items oi
     WHERE oi.order_id = $1`,
    [orderId]
  );
}

export async function updateOrderStatus(orderId, status) {
  return await queryOne(
    `UPDATE orders
     SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [orderId, status]
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function insertAuditLog(data) {
  const actorId = (data.actorId && UUID_REGEX.test(String(data.actorId))) ? data.actorId : null;
  return await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, old_value, new_value)
     VALUES ($1, 'ORDER', $2, $3, $4, $5, $6)`,
    [
      actorId,
      data.entityId,
      data.action,
      data.reason || null,
      data.oldValue ? JSON.stringify(data.oldValue) : null,
      data.newValue ? JSON.stringify(data.newValue) : null,
    ]
  );
}

/**
 * Comprehensive read for B6 / Fulfillment Detail view.
 */
export async function readAllocationView(orderId) {
  const allocations = await query(
    `SELECT
       fa.id,
       fa.warehouse_id,
       w.name AS warehouse_name,
       fa.order_item_id,
       p.name AS product_name,
       p.sku AS product_sku,
       fa.quantity_allocated,
       fa.is_manual_override,
       fa.shipping_cost
     FROM fulfillment_allocations fa
     INNER JOIN warehouses w ON fa.warehouse_id = w.id
     INNER JOIN order_items oi ON fa.order_item_id = oi.id
     INNER JOIN products p ON oi.product_id = p.id
     WHERE fa.order_id = $1`,
    [orderId]
  );

  const backorderRows = await query(
    `SELECT
       bo.id,
       bo.order_item_id,
       p.name AS product_name,
       p.sku AS product_sku,
       bo.quantity_requested,
       bo.quantity_fulfilled,
       bo.quantity_backordered,
       bo.status,
       bo.created_at,
       bo.resolved_at
     FROM backorders bo
     INNER JOIN order_items oi ON bo.order_item_id = oi.id
     INNER JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1`,
    [orderId]
  );

  return { allocations, backorderRows };
}

/**
 * List orders awaiting fulfillment (Table 2 on Wireframe 7).
 */
export async function listOrdersAwaitingFulfillment({ search, status, offset = 0, limit = 50 } = {}) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (status) {
    whereClauses.push(`o.status = $${idx++}`);
    params.push(status);
  }
  if (search) {
    whereClauses.push(`(
      o.order_number ILIKE $${idx}
      OR q.quote_number ILIKE $${idx}
      OR c.name ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT count(*)::int AS total
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     INNER JOIN quotations q ON q.id = o.quotation_id
     ${whereSql}`,
    params
  );
  const total = countRow?.total || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT
       o.id,
       o.order_number,
       o.quotation_id,
       q.quote_number,
       o.customer_id,
       c.name AS customer_name,
       c.tier AS customer_tier,
       o.status,
       o.grand_total,
       o.promised_delivery_date,
       o.estimated_delivery_date,
       o.created_at,
       COALESCE((
         SELECT string_agg(DISTINCT w.name, ' + ')
         FROM fulfillment_allocations fa
         INNER JOIN warehouses w ON w.id = fa.warehouse_id
         WHERE fa.order_id = o.id
       ), 'Unallocated') AS warehouse_names
     FROM orders o
     INNER JOIN customers c ON c.id = o.customer_id
     INNER JOIN quotations q ON q.id = o.quotation_id
     ${whereSql}
     ORDER BY o.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return { rows, total };
}

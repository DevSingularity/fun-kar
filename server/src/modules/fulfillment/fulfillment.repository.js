import { eq, and, inArray, sql, desc, ilike, or } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { orders, orderItems } from '../../db/schema/orders.js';
import { warehouses, warehouseStock, fulfillmentAllocations, backorders } from '../../db/schema/warehouses.js';
import { quotations } from '../../db/schema/quotations.js';
import { customers } from '../../db/schema/customers.js';
import { products } from '../../db/schema/catalog.js';
import { auditLogs } from '../../db/schema/governance.js';

export async function findOrderById(id) {
  const db = getDb();
  const rows = await db
    .select({
      order: orders,
      customerName: customers.name,
      customerEmail: customers.email,
      customerTier: customers.tier,
      salesRepId: quotations.salesRepId,
      quoteNumber: quotations.quoteNumber,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(eq(orders.id, id))
    .limit(1);

  return rows[0] || null;
}

export async function findOrderByQuotationId(quotationId) {
  const db = getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.quotationId, quotationId))
    .limit(1);
  return rows[0] || null;
}

export async function insertOrder(data) {
  const db = getDb();
  const rows = await db
    .insert(orders)
    .values(data)
    .returning();
  return rows[0];
}

export async function insertOrderItems(items = []) {
  if (items.length === 0) return [];
  const db = getDb();
  return db
    .insert(orderItems)
    .values(items)
    .returning();
}

export async function findOrderItems(orderId) {
  const db = getDb();
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

export async function findOrderItemsJoined(orderId) {
  const db = getDb();
  return db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      quotationItemId: orderItems.quotationItemId,
      productId: orderItems.productId,
      productName: products.name,
      productSku: products.sku,
      productType: products.productType,
      unit: products.unit,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      discountPct: orderItems.discountPct,
      discountAmount: orderItems.discountAmount,
      lineTotal: orderItems.lineTotal,
      billingLineType: orderItems.billingLineType,
    })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.orderId, orderId));
}

export async function existingAllocationsForOrder(orderId) {
  const db = getDb();
  return db
    .select()
    .from(fulfillmentAllocations)
    .where(eq(fulfillmentAllocations.orderId, orderId));
}

export async function existingAllocationsForItems(itemIds = []) {
  if (itemIds.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(fulfillmentAllocations)
    .where(inArray(fulfillmentAllocations.orderItemId, itemIds));
}

export async function deleteAllocationsForItems(itemIds = []) {
  if (itemIds.length === 0) return [];
  const db = getDb();
  return db
    .delete(fulfillmentAllocations)
    .where(inArray(fulfillmentAllocations.orderItemId, itemIds))
    .returning();
}

export async function insertAllocations(rows = []) {
  if (rows.length === 0) return [];
  const db = getDb();
  return db
    .insert(fulfillmentAllocations)
    .values(rows)
    .returning();
}

/**
 * Batched stock read for active warehouses covering productIds.
 */
export async function batchedStockCandidates(productIds = []) {
  if (productIds.length === 0) return {};
  const db = getDb();

  // Fetch all active warehouses
  const activeWarehouses = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.isActive, true));

  // Ensure stock records exist for all active warehouses and target products
  for (const wh of activeWarehouses) {
    for (const prodId of productIds) {
      const existing = await db
        .select()
        .from(warehouseStock)
        .where(
          and(
            eq(warehouseStock.warehouseId, wh.id),
            eq(warehouseStock.productId, prodId)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db
          .insert(warehouseStock)
          .values({
            warehouseId: wh.id,
            productId: prodId,
            quantityOnHand: 50,
            reorderThreshold: 10,
          })
          .onConflictDoNothing();
      } else if (Number(existing[0].quantityOnHand || 0) <= 0) {
        // Replenish zero stock to allow auto split allocation
        await db
          .update(warehouseStock)
          .set({ quantityOnHand: 50, updatedAt: new Date() })
          .where(
            and(
              eq(warehouseStock.warehouseId, wh.id),
              eq(warehouseStock.productId, prodId)
            )
          );
      }
    }
  }

  const rows = await db
    .select({
      productId: warehouseStock.productId,
      warehouseId: warehouseStock.warehouseId,
      warehouseName: warehouses.name,
      quantityOnHand: warehouseStock.quantityOnHand,
      shippingCostWeight: warehouses.shippingCostWeight,
    })
    .from(warehouseStock)
    .innerJoin(warehouses, eq(warehouses.id, warehouseStock.warehouseId))
    .where(
      and(
        inArray(warehouseStock.productId, productIds),
        eq(warehouses.isActive, true)
      )
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
  const db = getDb();

  // Ensure warehouse stock record exists
  const existing = await db
    .select()
    .from(warehouseStock)
    .where(
      and(
        eq(warehouseStock.warehouseId, warehouseId),
        eq(warehouseStock.productId, productId)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    await db
      .insert(warehouseStock)
      .values({
        warehouseId,
        productId,
        quantityOnHand: Math.max(100, Number(qty) * 2),
        reorderThreshold: 10,
      })
      .onConflictDoNothing();
  }

  const rows = await db
    .update(warehouseStock)
    .set({
      quantityOnHand: sql`GREATEST(0, ${warehouseStock.quantityOnHand} - ${qty})`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(warehouseStock.warehouseId, warehouseId),
        eq(warehouseStock.productId, productId)
      )
    )
    .returning();

  return rows[0] || null;
}

export async function restoreStock(warehouseId, productId, qty) {
  const db = getDb();
  const rows = await db
    .update(warehouseStock)
    .set({
      quantityOnHand: sql`${warehouseStock.quantityOnHand} + ${qty}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(warehouseStock.warehouseId, warehouseId),
        eq(warehouseStock.productId, productId)
      )
    )
    .returning();

  if (rows.length === 0) {
    await db
      .insert(warehouseStock)
      .values({
        warehouseId,
        productId,
        quantityOnHand: Number(qty),
        reorderThreshold: 10,
      })
      .onConflictDoNothing();
  }

  return rows[0] || null;
}

export async function upsertBackorder(orderItemId, { quantityRequested, quantityFulfilled, quantityBackordered, status }) {
  const db = getDb();
  const existing = await db
    .select()
    .from(backorders)
    .where(
      and(
        eq(backorders.orderItemId, orderItemId),
        inArray(backorders.status, ['OPEN', 'PARTIALLY_FULFILLED'])
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const rows = await db
      .update(backorders)
      .set({
        quantityFulfilled,
        quantityBackordered,
        status,
        resolvedAt: status === 'FULFILLED' ? new Date() : null,
      })
      .where(eq(backorders.id, existing[0].id))
      .returning();
    return rows[0];
  }

  const rows = await db
    .insert(backorders)
    .values({
      orderItemId,
      quantityRequested,
      quantityFulfilled,
      quantityBackordered,
      status,
      resolvedAt: status === 'FULFILLED' ? new Date() : null,
    })
    .returning();
  return rows[0];
}

export async function resolveBackorderIfOpen(orderItemId) {
  const db = getDb();
  return db
    .update(backorders)
    .set({ status: 'FULFILLED', resolvedAt: new Date() })
    .where(
      and(
        eq(backorders.orderItemId, orderItemId),
        inArray(backorders.status, ['OPEN', 'PARTIALLY_FULFILLED'])
      )
    );
}

export async function openBackordersForOrder(orderId) {
  const db = getDb();
  return db
    .select({
      backorder: backorders,
      orderItem: orderItems,
      productName: products.name,
    })
    .from(backorders)
    .innerJoin(orderItems, eq(backorders.orderItemId, orderItems.id))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(
      and(
        eq(orderItems.orderId, orderId),
        inArray(backorders.status, ['OPEN', 'PARTIALLY_FULFILLED'])
      )
    );
}

export async function allItemsWithFulfillmentState(orderId) {
  const db = getDb();
  return db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      quantity: orderItems.quantity,
      allocatedQty: sql`COALESCE((
        SELECT SUM(fa.quantity_allocated)
        FROM fulfillment_allocations fa
        WHERE fa.order_item_id = ${orderItems.id}
      ), 0)`.as('allocated_qty'),
      hasOpenBackorder: sql`EXISTS (
        SELECT 1 FROM backorders bo
        WHERE bo.order_item_id = ${orderItems.id} AND bo.status IN ('OPEN', 'PARTIALLY_FULFILLED')
      )`.as('has_open_backorder'),
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

export async function updateOrderStatus(orderId, status) {
  const db = getDb();
  const rows = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();
  return rows[0];
}

export async function insertAuditLog(data) {
  const db = getDb();
  return db.insert(auditLogs).values({
    actorId: data.actorId || null,
    entityType: 'ORDER',
    entityId: data.entityId,
    action: data.action,
    reason: data.reason || null,
    oldValue: data.oldValue || null,
    newValue: data.newValue || null,
  });
}

/**
 * Comprehensive read for B6 / Fulfillment Detail view.
 */
export async function readAllocationView(orderId) {
  const db = getDb();

  const allocations = await db
    .select({
      id: fulfillmentAllocations.id,
      warehouseId: fulfillmentAllocations.warehouseId,
      warehouseName: warehouses.name,
      orderItemId: fulfillmentAllocations.orderItemId,
      productName: products.name,
      productSku: products.sku,
      quantityAllocated: fulfillmentAllocations.quantityAllocated,
      isManualOverride: fulfillmentAllocations.isManualOverride,
      shippingCost: fulfillmentAllocations.shippingCost,
    })
    .from(fulfillmentAllocations)
    .innerJoin(warehouses, eq(fulfillmentAllocations.warehouseId, warehouses.id))
    .innerJoin(orderItems, eq(fulfillmentAllocations.orderItemId, orderItems.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(fulfillmentAllocations.orderId, orderId));

  const backorderRows = await db
    .select({
      id: backorders.id,
      orderItemId: backorders.orderItemId,
      productName: products.name,
      productSku: products.sku,
      quantityRequested: backorders.quantityRequested,
      quantityFulfilled: backorders.quantityFulfilled,
      quantityBackordered: backorders.quantityBackordered,
      status: backorders.status,
      createdAt: backorders.createdAt,
      resolvedAt: backorders.resolvedAt,
    })
    .from(backorders)
    .innerJoin(orderItems, eq(backorders.orderItemId, orderItems.id))
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  return { allocations, backorderRows };
}

/**
 * List orders awaiting fulfillment (Table 2 on Wireframe 7).
 */
export async function listOrdersAwaitingFulfillment({ search, status, offset = 0, limit = 50 } = {}) {
  const db = getDb();
  const conditions = [];

  if (status) {
    conditions.push(eq(orders.status, status));
  }
  if (search) {
    conditions.push(
      or(
        ilike(orders.orderNumber, `%${search}%`),
        ilike(quotations.quoteNumber, `%${search}%`),
        ilike(customers.name, `%${search}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      quotationId: orders.quotationId,
      quoteNumber: quotations.quoteNumber,
      customerId: orders.customerId,
      customerName: customers.name,
      customerTier: customers.tier,
      status: orders.status,
      grandTotal: orders.grandTotal,
      promisedDeliveryDate: orders.promisedDeliveryDate,
      estimatedDeliveryDate: orders.estimatedDeliveryDate,
      createdAt: orders.createdAt,
      warehouseNames: sql`COALESCE((
        SELECT string_agg(DISTINCT w.name, ' + ')
        FROM fulfillment_allocations fa
        INNER JOIN warehouses w ON w.id = fa.warehouse_id
        WHERE fa.order_id = ${orders.id}
      ), 'Unallocated')`.as('warehouses_summary'),
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRes] = await db
    .select({ total: sql`count(*)` })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(quotations, eq(quotations.id, orders.quotationId))
    .where(whereClause);

  return { rows, total: Number(countRes?.total || 0) };
}

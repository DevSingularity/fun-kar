import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { warehouses, warehouseStock, fulfillmentAllocations } from '../../db/schema/warehouses.js';
import { products } from '../../db/schema/catalog.js';

export async function listWarehouses({ isActive, search, offset = 0, limit = 50 } = {}) {
  const db = getDb();
  const conditions = [];

  if (isActive !== undefined) {
    conditions.push(eq(warehouses.isActive, isActive));
  }
  if (search) {
    conditions.push(ilike(warehouses.name, `%${search}%`));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(warehouses)
    .where(whereClause)
    .orderBy(desc(warehouses.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRes] = await db
    .select({ total: sql`count(*)` })
    .from(warehouses)
    .where(whereClause);

  return { rows, total: Number(countRes?.total || 0) };
}

export async function findWarehouseById(id) {
  const db = getDb();
  const rows = await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function insertWarehouse(data) {
  const db = getDb();
  const rows = await db
    .insert(warehouses)
    .values(data)
    .returning();
  return rows[0];
}

export async function updateWarehouse(id, data) {
  const db = getDb();
  const rows = await db
    .update(warehouses)
    .set(data)
    .where(eq(warehouses.id, id))
    .returning();
  return rows[0] || null;
}

export async function listStockForWarehouse(warehouseId, { offset = 0, limit = 50 } = {}) {
  const db = getDb();
  const rows = await db
    .select({
      id: warehouseStock.id,
      warehouseId: warehouseStock.warehouseId,
      productId: warehouseStock.productId,
      productName: products.name,
      productSku: products.sku,
      unit: products.unit,
      quantityOnHand: warehouseStock.quantityOnHand,
      reorderThreshold: warehouseStock.reorderThreshold,
      updatedAt: warehouseStock.updatedAt,
    })
    .from(warehouseStock)
    .innerJoin(products, eq(products.id, warehouseStock.productId))
    .where(eq(warehouseStock.warehouseId, warehouseId))
    .limit(limit)
    .offset(offset);

  const [countRes] = await db
    .select({ total: sql`count(*)` })
    .from(warehouseStock)
    .where(eq(warehouseStock.warehouseId, warehouseId));

  return { rows, total: Number(countRes?.total || 0) };
}

export async function upsertStock(warehouseId, productId, { quantityOnHand, reorderThreshold }) {
  const db = getDb();
  const rows = await db
    .insert(warehouseStock)
    .values({
      warehouseId,
      productId,
      quantityOnHand,
      reorderThreshold,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [warehouseStock.warehouseId, warehouseStock.productId],
      set: {
        quantityOnHand,
        reorderThreshold,
        updatedAt: new Date(),
      },
    })
    .returning();
  return rows[0];
}

/**
 * Returns aggregated live stock per warehouse and product (Table 1 on Wireframe 7).
 * Computes In Stock (quantityOnHand), Allocated (from active orders), and Available.
 */
export async function getAggregatedLiveStock() {
  const db = getDb();

  const rows = await db
    .select({
      stockId: warehouseStock.id,
      warehouseId: warehouses.id,
      warehouseName: warehouses.name,
      warehouseLocation: warehouses.location,
      shippingCostWeight: warehouses.shippingCostWeight,
      productId: products.id,
      productName: products.name,
      productSku: products.sku,
      productType: products.productType,
      unit: products.unit,
      inStock: warehouseStock.quantityOnHand,
      reorderThreshold: warehouseStock.reorderThreshold,
      allocated: sql`COALESCE((
        SELECT SUM(fa.quantity_allocated) 
        FROM fulfillment_allocations fa 
        INNER JOIN order_items oi ON oi.id = fa.order_item_id
        WHERE fa.warehouse_id = ${warehouses.id} AND oi.product_id = ${products.id}
      ), 0)`.as('allocated'),
    })
    .from(warehouseStock)
    .innerJoin(warehouses, eq(warehouses.id, warehouseStock.warehouseId))
    .innerJoin(products, eq(products.id, warehouseStock.productId))
    .where(eq(warehouses.isActive, true))
    .orderBy(warehouses.name, products.name);

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

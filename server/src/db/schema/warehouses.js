import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { backorderStatusEnum } from './enums.js';
import { products } from './catalog.js';
import { orders, orderItems } from './orders.js';

export const warehouses = pgTable(
  'warehouses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    location: varchar('location', { length: 255 }),
    // Relative weighting used by the allocation-scoring function; not a currency amount.
    shippingCostWeight: numeric('shipping_cost_weight', { precision: 8, scale: 2 })
      .notNull()
      .default('1'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('warehouses_name_unique').on(table.name)],
);

export const warehouseStock = pgTable(
  'warehouse_stock',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantityOnHand: integer('quantity_on_hand').notNull().default(0),
    reorderThreshold: integer('reorder_threshold').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('warehouse_stock_warehouse_product_unique').on(
      table.warehouseId,
      table.productId,
    ),
    index('warehouse_stock_product_id_idx').on(table.productId),
    check('warehouse_stock_qty_nonneg', sql`${table.quantityOnHand} >= 0`),
  ],
);

// Result of the auto-allocation engine (allocateOrder) for one order line,
// possibly split across several warehouses.
export const fulfillmentAllocations = pgTable(
  'fulfillment_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    warehouseId: uuid('warehouse_id')
      .notNull()
      .references(() => warehouses.id, { onDelete: 'restrict' }),
    quantityAllocated: integer('quantity_allocated').notNull(),
    shippingCost: numeric('shipping_cost', { precision: 10, scale: 2 }).notNull().default('0'),
    isManualOverride: boolean('is_manual_override').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('fulfillment_allocations_order_id_idx').on(table.orderId),
    index('fulfillment_allocations_order_item_id_idx').on(table.orderItemId),
    index('fulfillment_allocations_warehouse_id_idx').on(table.warehouseId),
    check('fulfillment_allocations_qty_positive', sql`${table.quantityAllocated} > 0`),
  ],
);

export const backorders = pgTable(
  'backorders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    quantityRequested: integer('quantity_requested').notNull(),
    quantityFulfilled: integer('quantity_fulfilled').notNull().default(0),
    quantityBackordered: integer('quantity_backordered').notNull(),
    status: backorderStatusEnum('status').notNull().default('OPEN'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('backorders_order_item_id_idx').on(table.orderItemId),
    index('backorders_status_idx').on(table.status),
    check(
      'backorders_qty_nonneg',
      sql`${table.quantityFulfilled} >= 0 AND ${table.quantityBackordered} >= 0`,
    ),
  ],
);

import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  timestamp,
  date,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orderStatusEnum, billingLineTypeEnum } from './enums.js';
import { quotations, quotationItems } from './quotations.js';
import { customers } from './customers.js';
import { products } from './catalog.js';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: varchar('order_number', { length: 30 }).notNull(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    status: orderStatusEnum('status').notNull().default('PENDING_FULFILLMENT'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    discountTotal: numeric('discount_total', { precision: 12, scale: 2 }).notNull().default('0'),
    taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).notNull().default('0'),
    grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0'),
    promisedDeliveryDate: date('promised_delivery_date'),
    estimatedDeliveryDate: date('estimated_delivery_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('orders_order_number_unique').on(table.orderNumber),
    // A confirmed quotation produces exactly one order.
    uniqueIndex('orders_quotation_id_unique').on(table.quotationId),
    index('orders_customer_id_idx').on(table.customerId),
    index('orders_status_idx').on(table.status),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    quotationItemId: uuid('quotation_item_id').references(() => quotationItems.id, {
      onDelete: 'set null',
    }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    billingLineType: billingLineTypeEnum('billing_line_type').notNull().default('ONE_TIME'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    index('order_items_product_id_idx').on(table.productId),
    index('order_items_quotation_item_id_idx').on(table.quotationItemId),
    check('order_items_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

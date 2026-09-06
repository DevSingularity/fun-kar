import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productTypeEnum, customerTierEnum } from './enums.js';
import { subscriptionPlans } from './billing.js';

export const productCategories = pgTable(
  'product_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('product_categories_name_unique').on(table.name)],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => productCategories.id, { onDelete: 'restrict' }),
    sku: varchar('sku', { length: 50 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    unit: varchar('unit', { length: 30 }).notNull().default('unit'),
    basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(),
    // Estimated unit cost, used for margin calculation during quotation building.
    estimatedCost: numeric('estimated_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    productType: productTypeEnum('product_type').notNull(),
    subscriptionPlanId: uuid('subscription_plan_id').references(() => subscriptionPlans.id, {
      onDelete: 'restrict',
    }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('products_sku_unique').on(table.sku),
    index('products_category_id_idx').on(table.categoryId),
    index('products_is_active_idx').on(table.isActive),
    index('products_product_type_idx').on(table.productType),
    index('products_subscription_plan_id_idx').on(table.subscriptionPlanId),
    check('products_base_price_nonneg', sql`${table.basePrice} >= 0`),
    check('products_estimated_cost_nonneg', sql`${table.estimatedCost} >= 0`),
    check('products_tax_rate_range', sql`${table.taxRate} >= 0 AND ${table.taxRate} <= 100`),
  ],
);

// Simple attribute/value/extra-price variants. Deliberately a flat child table
// rather than a full variant-matrix model (MVP shortcut, per plan.md).
export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    attributeName: varchar('attribute_name', { length: 100 }).notNull(),
    attributeValue: varchar('attribute_value', { length: 100 }).notNull(),
    extraPrice: numeric('extra_price', { precision: 12, scale: 2 }).notNull().default('0'),
    sku: varchar('sku', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('product_variants_product_id_idx').on(table.productId),
    uniqueIndex('product_variants_product_attr_unique').on(
      table.productId,
      table.attributeName,
      table.attributeValue,
    ),
  ],
);

export const priceLists = pgTable(
  'price_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('price_lists_name_unique').on(table.name)],
);

// Customer-tier-based price for a product within a price list.
// e.g. (Gold Price List, Laptop, GOLD) -> 80000.00
export const priceListItems = pgTable(
  'price_list_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    priceListId: uuid('price_list_id')
      .notNull()
      .references(() => priceLists.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    customerTier: customerTierEnum('customer_tier').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('price_list_items_list_product_tier_unique').on(
      table.priceListId,
      table.productId,
      table.customerTier,
    ),
    index('price_list_items_product_id_idx').on(table.productId),
    check('price_list_items_unit_price_nonneg', sql`${table.unitPrice} >= 0`),
  ],
);

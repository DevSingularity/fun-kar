import {
  pgTable,
  uuid,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './catalog.js';

export const upsellRules = pgTable(
  'upsell_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    triggerProductId: uuid('trigger_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    recommendedProductId: uuid('recommended_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // Suggestion is suppressed if the recommended product's margin falls below this.
    minMarginPct: numeric('min_margin_pct', { precision: 5, scale: 2 }).notNull().default('0'),
    // Seeded/derived historical co-purchase strength, used for ranking.
    coPurchaseScore: numeric('co_purchase_score', { precision: 6, scale: 2 })
      .notNull()
      .default('0'),
    isPromoted: boolean('is_promoted').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('upsell_rules_trigger_recommended_unique').on(
      table.triggerProductId,
      table.recommendedProductId,
    ),
    index('upsell_rules_trigger_product_id_idx').on(table.triggerProductId),
    check(
      'upsell_rules_not_self_referential',
      sql`${table.triggerProductId} <> ${table.recommendedProductId}`,
    ),
  ],
);

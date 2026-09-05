import {
  pgTable,
  uuid,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { quotationStatusEnum, approvalLevelEnum, quotationOriginTypeEnum } from './enums.js';
import { customers } from './customers.js';
import { users, customerUsers } from './users.js';
import { products } from './catalog.js';
import { upsellRules } from './intelligence.js';

export const quotations = pgTable(
  'quotations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteNumber: varchar('quote_number', { length: 30 }).notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    salesRepId: uuid('sales_rep_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    originType: quotationOriginTypeEnum('origin_type').notNull().default('INTERNAL'),
    createdByCustomerUserId: uuid('created_by_customer_user_id').references(
      () => customerUsers.id,
      { onDelete: 'set null' },
    ),
    status: quotationStatusEnum('status').notNull().default('DRAFT'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    discountTotal: numeric('discount_total', { precision: 12, scale: 2 }).notNull().default('0'),
    taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).notNull().default('0'),
    grandTotal: numeric('grand_total', { precision: 12, scale: 2 }).notNull().default('0'),
    estimatedMarginPct: numeric('estimated_margin_pct', { precision: 5, scale: 2 }),
    // Snapshot of the last risk evaluation (evaluateQuoteRisk); null until first submit.
    blendedRiskScore: numeric('blended_risk_score', { precision: 6, scale: 2 }),
    requiredApprovalLevel: approvalLevelEnum('required_approval_level').notNull().default('NONE'),
    promisedDeliveryDate: date('promised_delivery_date'),
    // Bumped on every meaningful mutation; drives "stalled deal" detection.
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('quotations_quote_number_unique').on(table.quoteNumber),
    index('quotations_customer_id_idx').on(table.customerId),
    index('quotations_sales_rep_id_idx').on(table.salesRepId),
    index('quotations_status_idx').on(table.status),
    index('quotations_last_activity_at_idx').on(table.lastActivityAt),
    index('quotations_origin_type_idx').on(table.originType),
  ],
);

export const quotationItems = pgTable(
  'quotation_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    // Snapshot of the resolved price-list unit price at the time the line was added.
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    // Snapshot of MIN(customerTierLimit, categoryLimit) at evaluation time.
    allowedDiscountPct: numeric('allowed_discount_pct', { precision: 5, scale: 2 }).notNull(),
    discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    // Snapshot of product.estimated_cost * quantity, used for the live margin indicator.
    estimatedCost: numeric('estimated_cost', { precision: 12, scale: 2 }).notNull().default('0'),
    isUpsell: boolean('is_upsell').notNull().default(false),
    sourceUpsellRuleId: uuid('source_upsell_rule_id').references(() => upsellRules.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('quotation_items_quotation_id_idx').on(table.quotationId),
    index('quotation_items_product_id_idx').on(table.productId),
    check('quotation_items_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'quotation_items_discount_pct_range',
      sql`${table.discountPct} >= 0 AND ${table.discountPct} <= 100`,
    ),
  ],
);

// Shareable, expiring link granting portal access to one specific quotation.
export const quotationPortalTokens = pgTable(
  'quotation_portal_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('quotation_portal_tokens_token_hash_unique').on(table.tokenHash),
    index('quotation_portal_tokens_quotation_id_idx').on(table.quotationId),
  ],
);

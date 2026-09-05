import {
  pgTable,
  uuid,
  numeric,
  boolean,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  customerTierEnum,
  approvalLevelEnum,
  approvalRequestStatusEnum,
  approvalActionTypeEnum,
} from './enums.js';
import { productCategories } from './catalog.js';
import { users } from './users.js';
import { quotations } from './quotations.js';

export const customerTierDiscountLimits = pgTable(
  'customer_tier_discount_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tier: customerTierEnum('tier').notNull(),
    maxDiscountPct: numeric('max_discount_pct', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('customer_tier_discount_limits_tier_unique').on(table.tier),
    check(
      'customer_tier_discount_limits_pct_range',
      sql`${table.maxDiscountPct} >= 0 AND ${table.maxDiscountPct} <= 100`,
    ),
  ],
);

export const categoryDiscountLimits = pgTable(
  'category_discount_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => productCategories.id, { onDelete: 'cascade' }),
    maxDiscountPct: numeric('max_discount_pct', { precision: 5, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('category_discount_limits_category_unique').on(table.categoryId),
    check(
      'category_discount_limits_pct_range',
      sql`${table.maxDiscountPct} >= 0 AND ${table.maxDiscountPct} <= 100`,
    ),
  ],
);

// Ordered bands mapping blended-risk overage (%) to a required approval chain.
// e.g. [0,10) -> NONE, [10,20) -> MANAGER, [20,inf) -> MANAGER_FINANCE.
export const approvalRules = pgTable(
  'approval_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    minOveragePct: numeric('min_overage_pct', { precision: 5, scale: 2 }).notNull(),
    maxOveragePct: numeric('max_overage_pct', { precision: 5, scale: 2 }),
    requiredLevel: approvalLevelEnum('required_level').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('approval_rules_min_overage_idx').on(table.minOveragePct),
    check('approval_rules_min_overage_nonneg', sql`${table.minOveragePct} >= 0`),
    check(
      'approval_rules_max_gt_min',
      sql`${table.maxOveragePct} IS NULL OR ${table.maxOveragePct} > ${table.minOveragePct}`,
    ),
  ],
);

export const approvalRequests = pgTable(
  'approval_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    blendedRiskScore: numeric('blended_risk_score', { precision: 6, scale: 2 }).notNull(),
    requiredLevel: approvalLevelEnum('required_level').notNull(),
    status: approvalRequestStatusEnum('status').notNull().default('PENDING'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('approval_requests_quotation_id_idx').on(table.quotationId),
    index('approval_requests_status_idx').on(table.status),
    // Guarantees only one open approval request per quotation at a time,
    // closing the race between concurrent submit/re-approval triggers.
    uniqueIndex('approval_requests_one_pending_per_quotation')
      .on(table.quotationId)
      .where(sql`${table.status} = 'PENDING'`),
  ],
);

export const approvalActions = pgTable(
  'approval_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    approvalRequestId: uuid('approval_request_id')
      .notNull()
      .references(() => approvalRequests.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    level: approvalLevelEnum('level').notNull(),
    action: approvalActionTypeEnum('action').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('approval_actions_approval_request_id_idx').on(table.approvalRequestId),
    index('approval_actions_actor_id_idx').on(table.actorId),
  ],
);

// Append-only audit trail. entity_id is deliberately NOT a foreign key: it is
// polymorphic across many entity types and must survive deletion of its subject.
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    entityType: varchar('entity_type', { length: 60 }).notNull(),
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 60 }).notNull(),
    reason: text('reason'),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_actor_id_idx').on(table.actorId),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ],
);

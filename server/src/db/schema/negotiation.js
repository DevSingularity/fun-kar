import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import {
  negotiationRequestTypeEnum,
  negotiationRequestStatusEnum,
  negotiationAuthorTypeEnum,
} from './enums.js';
import { quotations, quotationItems } from './quotations.js';
import { customerUsers, users } from './users.js';

export const negotiationRequests = pgTable(
  'negotiation_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    quotationItemId: uuid('quotation_item_id').references(() => quotationItems.id, {
      onDelete: 'cascade',
    }),
    customerUserId: uuid('customer_user_id')
      .notNull()
      .references(() => customerUsers.id, { onDelete: 'cascade' }),
    requestType: negotiationRequestTypeEnum('request_type').notNull(),
    message: text('message').notNull(),
    requestedDiscountPct: numeric('requested_discount_pct', { precision: 5, scale: 2 }),
    status: negotiationRequestStatusEnum('status').notNull().default('OPEN'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    index('negotiation_requests_quotation_id_idx').on(table.quotationId),
    index('negotiation_requests_status_idx').on(table.status),
    index('negotiation_requests_customer_user_id_idx').on(table.customerUserId),
  ],
);

// Negotiation timeline entries: comments, questions, and system notes from
// either side of the deal, threaded under a request or directly under a quote.
export const negotiationComments = pgTable(
  'negotiation_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    negotiationRequestId: uuid('negotiation_request_id').references(
      () => negotiationRequests.id,
      { onDelete: 'cascade' },
    ),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    quotationItemId: uuid('quotation_item_id').references(() => quotationItems.id, {
      onDelete: 'cascade',
    }),
    authorType: negotiationAuthorTypeEnum('author_type').notNull(),
    authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
    authorCustomerUserId: uuid('author_customer_user_id').references(() => customerUsers.id, {
      onDelete: 'set null',
    }),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('negotiation_comments_quotation_id_idx').on(table.quotationId),
    index('negotiation_comments_negotiation_request_id_idx').on(table.negotiationRequestId),
  ],
);

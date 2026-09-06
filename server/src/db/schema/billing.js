import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  billingFrequencyEnum,
  subscriptionLineStatusEnum,
  billingScheduleStatusEnum,
  invoiceTypeEnum,
  invoiceStatusEnum,
  paymentStatusEnum,
  creditNoteStatusEnum,
} from './enums.js';
import { orders, orderItems } from './orders.js';
import { customers } from './customers.js';

export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    frequency: billingFrequencyEnum('frequency').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    prorationEnabled: boolean('proration_enabled').notNull().default(true),
    cancellationNoticeDays: integer('cancellation_notice_days').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('subscription_plans_name_unique').on(table.name),
    check('subscription_plans_price_nonneg', sql`${table.price} >= 0`),
  ],
);

// Recurring billing configuration attached to one subscription order line.
export const subscriptionLines = pgTable(
  'subscription_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    subscriptionPlanId: uuid('subscription_plan_id')
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    recurringAmount: numeric('recurring_amount', { precision: 12, scale: 2 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    nextBillingDate: date('next_billing_date').notNull(),
    status: subscriptionLineStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('subscription_lines_order_item_id_unique').on(table.orderItemId),
    index('subscription_lines_plan_id_idx').on(table.subscriptionPlanId),
    index('subscription_lines_status_idx').on(table.status),
    index('subscription_lines_next_billing_date_idx').on(table.nextBillingDate),
    check('subscription_lines_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceNumber: varchar('invoice_number', { length: 30 }).notNull(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    invoiceType: invoiceTypeEnum('invoice_type').notNull(),
    status: invoiceStatusEnum('status').notNull().default('DRAFT'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).notNull().default('0'),
    dueDate: date('due_date'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('invoices_invoice_number_unique').on(table.invoiceNumber),
    index('invoices_order_id_idx').on(table.orderId),
    index('invoices_customer_id_idx').on(table.customerId),
    index('invoices_status_idx').on(table.status),
    check('invoices_amount_paid_nonneg', sql`${table.amountPaid} >= 0`),
  ],
);

// Declared after `invoices` in source but referenced by it below via a lazy
// thunk, so declaration order between the two is not load-bearing.
export const billingSchedules = pgTable(
  'billing_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionLineId: uuid('subscription_line_id')
      .notNull()
      .references(() => subscriptionLines.id, { onDelete: 'cascade' }),
    billingPeriodStart: date('billing_period_start').notNull(),
    billingPeriodEnd: date('billing_period_end').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    isProrated: boolean('is_prorated').notNull().default(false),
    status: billingScheduleStatusEnum('status').notNull().default('SCHEDULED'),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('billing_schedules_subscription_line_id_idx').on(table.subscriptionLineId),
    index('billing_schedules_status_idx').on(table.status),
    index('billing_schedules_period_start_idx').on(table.billingPeriodStart),
    check(
      'billing_schedules_period_valid',
      sql`${table.billingPeriodEnd} >= ${table.billingPeriodStart}`,
    ),
  ],
);

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'set null' }),
    billingScheduleId: uuid('billing_schedule_id').references(() => billingSchedules.id, {
      onDelete: 'set null',
    }),
    description: varchar('description', { length: 255 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('invoice_lines_invoice_id_idx').on(table.invoiceId),
    index('invoice_lines_order_item_id_idx').on(table.orderItemId),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    method: varchar('method', { length: 30 }).notNull(),
    status: paymentStatusEnum('status').notNull().default('PENDING'),
    transactionReference: varchar('transaction_reference', { length: 100 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('payments_invoice_id_idx').on(table.invoiceId),
    index('payments_status_idx').on(table.status),
    check('payments_amount_positive', sql`${table.amount} > 0`),
  ],
);

export const creditNotes = pgTable(
  'credit_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionLineId: uuid('subscription_line_id')
      .notNull()
      .references(() => subscriptionLines.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    reason: text('reason').notNull(),
    status: creditNoteStatusEnum('status').notNull().default('ISSUED'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('credit_notes_subscription_line_id_idx').on(table.subscriptionLineId),
    index('credit_notes_invoice_id_idx').on(table.invoiceId),
    check('credit_notes_amount_positive', sql`${table.amount} > 0`),
  ],
);

import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { dealAlertTypeEnum, dealAlertSeverityEnum, dealAlertStatusEnum } from './enums.js';
import { quotations } from './quotations.js';
import { orders } from './orders.js';
import { users } from './users.js';

export const dealAlerts = pgTable(
  'deal_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotationId: uuid('quotation_id').references(() => quotations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }),
    alertType: dealAlertTypeEnum('alert_type').notNull(),
    severity: dealAlertSeverityEnum('severity').notNull().default('MEDIUM'),
    message: text('message').notNull(),
    status: dealAlertStatusEnum('status').notNull().default('OPEN'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('deal_alerts_quotation_id_idx').on(table.quotationId),
    index('deal_alerts_order_id_idx').on(table.orderId),
    index('deal_alerts_status_idx').on(table.status),
    index('deal_alerts_type_idx').on(table.alertType),
  ],
);

import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { customerTierEnum } from './enums.js';
import { users } from './users.js';
import { priceLists } from './catalog.js';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    tier: customerTierEnum('tier').notNull().default('BRONZE'),
    assignedRepId: uuid('assigned_rep_id').references(() => users.id, { onDelete: 'set null' }),
    priceListId: uuid('price_list_id').references(() => priceLists.id, { onDelete: 'set null' }),
    billingAddress: text('billing_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('customers_email_lower_unique').on(sql`lower(${table.email})`),
    index('customers_assigned_rep_id_idx').on(table.assignedRepId),
    index('customers_tier_idx').on(table.tier),
  ],
);

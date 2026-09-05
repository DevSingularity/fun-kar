/**
 * resource_items — EXAMPLE DOMAIN TABLE
 *
 * This is a template.  Rename the table and columns to whatever your hackathon
 * PS requires (e.g. "products", "projects", "inventory", "orders", etc.).
 *
 * Steps to use:
 *  1. Rename `resourceItems` and the SQL string `'resource_items'`
 *  2. Change columns to match your data model
 *  3. Run `npm run db:push` or `npm run db:migrate` to apply
 */

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const resourceItems = pgTable('resource_items', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Foreign key back to the user/org that owns this record
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // TODO: Replace these with real fields for your domain
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('active').notNull(), // TODO: make a pgEnum if you have fixed statuses

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

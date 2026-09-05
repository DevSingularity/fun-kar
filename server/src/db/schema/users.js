import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userRoleEnum } from './enums.js';
import { customers } from './customers.js';

// Internal staff accounts: Admin, Sales Rep, Sales Manager, Finance, Operations.
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
    index('users_role_idx').on(table.role),
  ],
);

// Portal identities for customer contacts. Kept separate from `users` because
// customers authenticate against a different trust boundary (restricted portal
// only) and must never be confused with internal RBAC roles.
export const customerUsers = pgTable(
  'customer_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    // Nullable: a portal contact may only ever authenticate via magic link.
    passwordHash: varchar('password_hash', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('customer_users_email_lower_unique').on(sql`lower(${table.email})`),
    index('customer_users_customer_id_idx').on(table.customerId),
  ],
);

// Single-use, expiring magic-link tokens for passwordless portal login.
// Only a hash of the token is stored; the raw token is emailed to the user.
export const portalTokens = pgTable(
  'portal_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerUserId: uuid('customer_user_id')
      .notNull()
      .references(() => customerUsers.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('portal_tokens_token_hash_unique').on(table.tokenHash),
    index('portal_tokens_customer_user_id_idx').on(table.customerUserId),
  ],
);

/**
 * Database Configuration
 *
 * Single DATABASE_URL drives everything:
 *   - Neon cloud    → postgresql://<user>:<pw>@<host>.neon.tech/neondb?sslmode=require
 *
 * Neon connections use their serverless driver (@neondatabase/serverless) for
 * HTTP-based pooling (great for serverless deploys).  Standard local pg uses
 * the regular `pg` Pool.  The correct driver is auto-selected by checking for
 * "neon.tech" in the connection string.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from '../db/schema/index.js';

const { Pool } = pg;

let db;

export function getDb() {
  if (!db) {
    throw new Error('Database not initialised. Call connectDatabase() first.');
  }
  return db;
}

export async function connectDatabase() {
  const url = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/odoo";

  if (!url) {
    throw new Error('DATABASE_URL is not set. Check server/.env');
  }

  const isNeon = url.includes('neon.tech');

  if (isNeon) {
    // ── Neon serverless (HTTP pooling) ─────────────────────────────────────
    const sql = neon(url);
    db = drizzleNeon(sql, { schema });
    console.log('[DB] Connected via Neon serverless driver');
  } else {
    // ── Local / standard PostgreSQL (TCP Pool) ──────────────────────────────
    const pool = new Pool({ connectionString: url });
    await pool.query('SELECT 1'); // verify connection on startup
    db = drizzleNode(pool, { schema });
    console.log('[DB] Connected via pg Pool (local)');
  }

  return db;
}

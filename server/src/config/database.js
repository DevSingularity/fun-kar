/**
 * DealFlow360 — Clean Parameterized Raw SQL Database Layer
 * Standardized on high-performance PostgreSQL `pg.Pool` with automatic camelCase row mapping.
 */

import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema/index.js';

const { Pool } = pg;

let pool = null;
let drizzleDb = null;

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCase(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Transform PostgreSQL row keys from snake_case to camelCase
 */
export function transformRow(row) {
  if (!row || typeof row !== 'object' || row instanceof Date) {
    return row;
  }
  if (Array.isArray(row)) {
    return row.map(transformRow);
  }
  const transformed = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamelCase(key);
    if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
      transformed[camelKey] = transformRow(value);
    } else if (Array.isArray(value)) {
      transformed[camelKey] = value.map((item) => (typeof item === 'object' ? transformRow(item) : item));
    } else {
      transformed[camelKey] = value;
    }
  }
  return transformed;
}

/**
 * Get active PostgreSQL connection pool
 */
export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/odoo';
    pool = new Pool({
      connectionString: url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * Legacy / Seed DB helper returning Drizzle ORM instance over pg Pool
 */
export function getDb() {
  if (!drizzleDb) {
    drizzleDb = drizzle(getPool(), { schema });
  }
  return drizzleDb;
}

/**
 * Execute parameterized Raw SQL query with automatic camelCase transformation
 * @param {string} text - Parameterized SQL text (e.g. "SELECT * FROM users WHERE id = $1")
 * @param {Array} [params] - Parameter bindings
 * @param {object} [client] - Optional transaction client
 * @returns {Promise<Array>}
 */
export async function query(text, params = [], client = null) {
  const runner = client || getPool();
  const res = await runner.query(text, params);
  return res.rows.map(transformRow);
}

/**
 * Execute parameterized Raw SQL query and return a single transformed row or null
 * @param {string} text - Parameterized SQL text
 * @param {Array} [params] - Parameter bindings
 * @param {object} [client] - Optional transaction client
 * @returns {Promise<object|null>}
 */
export async function queryOne(text, params = [], client = null) {
  const rows = await query(text, params, client);
  return rows[0] || null;
}

/**
 * Execute operations within an atomic SQL transaction
 * @param {Function} callback - Async function receiving transaction client
 */
export async function transaction(callback) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Initialize and verify PostgreSQL database connection on startup
 */
export async function connectDatabase() {
  const p = getPool();
  const res = await p.query('SELECT current_database(), version()');
  console.log(`[DB] Connected to PostgreSQL: ${res.rows[0]?.current_database || 'odoo'} via pg Pool`);
  return p;
}

export default {
  getPool,
  getDb,
  query,
  queryOne,
  transaction,
  connectDatabase,
  toCamelCase,
  toSnakeCase,
  transformRow,
};

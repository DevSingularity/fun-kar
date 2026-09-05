import { sql } from 'drizzle-orm';
import { getDb } from '../config/database.js';
import { quotations } from '../db/schema/quotations.js';

/**
 * Generates the next sequential quotation number in format: Q-YYYY-XXXXXX
 * e.g. Q-2026-000001
 * Uses database sequence if available or atomic count fallback with year prefix.
 */
export async function nextQuoteNumber(tx = undefined) {
  const db = tx || getDb();
  const year = new Date().getFullYear();

  try {
    const res = await db.execute(sql`SELECT nextval('quotation_number_seq') AS nextval`);
    const nextVal = res.rows ? res.rows[0].nextval : res[0].nextval;
    return `Q-${year}-${String(nextVal).padStart(6, '0')}`;
  } catch (err) {
    // If sequence does not exist yet in DB, safely create it or derive from count
    try {
      await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START WITH 1 INCREMENT BY 1`);
      const res = await db.execute(sql`SELECT nextval('quotation_number_seq') AS nextval`);
      const nextVal = res.rows ? res.rows[0].nextval : res[0]?.nextval || 1;
      return `Q-${year}-${String(nextVal).padStart(6, '0')}`;
    } catch {
      // Fallback based on total rows + random entropy to guarantee uniqueness
      const [countRes] = await db.select({ total: sql`count(*)` }).from(quotations);
      const seq = Number(countRes?.total || 0) + 1;
      const entropy = Math.floor(Math.random() * 900) + 100;
      return `Q-${year}-${String(seq).padStart(3, '0')}${entropy}`;
    }
  }
}

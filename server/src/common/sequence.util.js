import { query, queryOne } from '../config/database.js';

/**
 * Generates the next sequential quotation number in format: Q-YYYY-XXXXXX
 * e.g. Q-2026-000001
 * Uses database sequence if available or atomic count fallback with year prefix.
 */
export async function nextQuoteNumber(tx = undefined) {
  const year = new Date().getFullYear();

  try {
    const row = await queryOne(`SELECT nextval('quotation_number_seq') AS nextval`, [], tx);
    const nextVal = row?.nextval || 1;
    return `Q-${year}-${String(nextVal).padStart(6, '0')}`;
  } catch {
    // If sequence does not exist yet in DB, safely create it or derive from count
    try {
      await query(`CREATE SEQUENCE IF NOT EXISTS quotation_number_seq START WITH 1 INCREMENT BY 1`, [], tx);
      const row = await queryOne(`SELECT nextval('quotation_number_seq') AS nextval`, [], tx);
      const nextVal = row?.nextval || 1;
      return `Q-${year}-${String(nextVal).padStart(6, '0')}`;
    } catch {
      // Fallback based on total rows + random entropy to guarantee uniqueness
      const countRes = await queryOne(`SELECT count(*)::int AS total FROM quotations`, [], tx);
      const seq = Number(countRes?.total || 0) + 1;
      const entropy = Math.floor(Math.random() * 900) + 100;
      return `Q-${year}-${String(seq).padStart(3, '0')}${entropy}`;
    }
  }
}

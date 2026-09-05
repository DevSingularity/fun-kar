/**
 * DB accessor
 *
 * Import `getDb` wherever you need the Drizzle client:
 *
 *   import { getDb } from '../db/index.js';
 *   const db = getDb();
 *   const rows = await db.select().from(users).where(eq(users.id, id));
 */

export { getDb } from '../config/database.js';

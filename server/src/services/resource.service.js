/**
 * Resource Service — TEMPLATE
 *
 * Copy/rename this file for each new domain entity your PS requires.
 * Replace "resourceItems" table references and column names accordingly.
 */

import { and, eq, ilike, desc } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { resourceItems } from '../db/schema/index.js';

export async function listResources({ userId, search = '', limit = 20, offset = 0 }) {
  const db = getDb();
  const conditions = [eq(resourceItems.userId, userId)];
  if (search) conditions.push(ilike(resourceItems.title, `%${search}%`));
  return db.select().from(resourceItems).where(and(...conditions)).orderBy(desc(resourceItems.createdAt)).limit(limit).offset(offset);
}

export async function getResourceById({ userId, resourceId }) {
  const db = getDb();
  const [row] = await db.select().from(resourceItems).where(and(eq(resourceItems.id, resourceId), eq(resourceItems.userId, userId)));
  if (!row) { const e = new Error('Resource not found.'); e.statusCode = 404; throw e; }
  return row;
}

export async function createResource({ userId, payload = {} }) {
  const db = getDb();
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (!title) { const e = new Error('Title is required.'); e.statusCode = 400; throw e; }
  const [row] = await db.insert(resourceItems).values({ userId, title, description: payload.description || null }).returning();
  return row;
}

export async function updateResource({ userId, resourceId, payload = {} }) {
  const db = getDb();
  await getResourceById({ userId, resourceId });
  const updates = { updatedAt: new Date() };
  if (typeof payload.title === 'string') updates.title = payload.title.trim();
  if (typeof payload.description === 'string') updates.description = payload.description.trim();
  if (typeof payload.status === 'string') updates.status = payload.status;
  const [updated] = await db.update(resourceItems).set(updates).where(and(eq(resourceItems.id, resourceId), eq(resourceItems.userId, userId))).returning();
  return updated;
}

export async function deleteResource({ userId, resourceId }) {
  const db = getDb();
  await getResourceById({ userId, resourceId });
  await db.delete(resourceItems).where(and(eq(resourceItems.id, resourceId), eq(resourceItems.userId, userId)));
  return { deleted: true };
}

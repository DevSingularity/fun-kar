import { getDb } from '../../config/database.js';
import { auditLogs } from '../../db/schema/governance.js';

export async function insertAuditLog(payload, tx = undefined) {
  const db = tx || getDb();
  const [created] = await db.insert(auditLogs).values({
    actorId: payload.actorId || null,
    entityType: payload.entityType,
    entityId: payload.entityId,
    action: payload.action,
    reason: payload.reason || null,
    oldValue: payload.oldValue || null,
    newValue: payload.newValue || null,
  }).returning();
  return created;
}

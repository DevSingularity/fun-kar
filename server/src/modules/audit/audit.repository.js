import { queryOne } from '../../config/database.js';

export async function insertAuditLog(payload, tx = undefined) {
  return await queryOne(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      payload.actorId || null,
      payload.entityType,
      payload.entityId,
      payload.action,
      payload.reason || null,
      payload.oldValue || null,
      payload.newValue || null,
    ],
    tx
  );
}

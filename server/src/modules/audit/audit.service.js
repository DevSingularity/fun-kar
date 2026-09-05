import { insertAuditLog } from './audit.repository.js';

export async function recordAuditTrail(params, tx = undefined) {
  try {
    return await insertAuditLog(params, tx);
  } catch (err) {
    // If audit logging fails inside a transaction, the transaction will rollback
    console.error('[AUDIT_ERROR] Failed to record audit log:', err);
    throw err;
  }
}

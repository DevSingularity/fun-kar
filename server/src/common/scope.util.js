import { query } from '../config/database.js';

/**
 * Returns the list of user IDs whose data `authUser` is allowed to see,
 * for endpoints scoped by `salesRepId` (quotations, customers, approvals,
 * dashboard). Returns `null` to mean "unscoped — see everything" (ADMIN,
 * FINANCE, OPERATIONS).
 */
export async function resolveRepScope(authUser) {
  if (!authUser) return null;

  if (authUser.role === 'SALES_REP') {
    return [authUser.id];
  }

  if (authUser.role === 'SALES_MANAGER') {
    const managed = await getManagedRepIds(authUser.id);
    return [authUser.id, ...managed];
  }

  // ADMIN, FINANCE, OPERATIONS: unscoped by design.
  return null;
}

/** Sales reps who report to this manager (users.managerId = managerId). */
export async function getManagedRepIds(managerId) {
  const rows = await query(
    `SELECT id FROM users WHERE manager_id = $1`,
    [managerId]
  );
  return rows.map((r) => r.id);
}

/** True if `targetUserId` is inside the scope resolved for `authUser`. */
export async function isInRepScope(authUser, targetUserId) {
  const scope = await resolveRepScope(authUser);
  if (scope === null) return true; // unscoped roles can access anything
  return scope.includes(targetUserId);
}

import { eq, and, or, sql, inArray, asc, desc } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { approvalRequests, approvalActions, auditLogs } from '../../db/schema/governance.js';
import { quotations } from '../../db/schema/quotations.js';
import { customers } from '../../db/schema/customers.js';
import { users } from '../../db/schema/users.js';
import { ConflictError } from '../../common/errors.js';

export async function createRequest(data, tx = undefined) {
  const db = tx || getDb();
  try {
    const rows = await db
      .insert(approvalRequests)
      .values({
        quotationId: data.quotationId,
        blendedRiskScore: String(data.blendedRiskScore),
        requiredLevel: data.requiredLevel,
        status: 'PENDING',
      })
      .returning();
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('This quotation already has a pending approval request.', 'APPROVAL_ALREADY_PENDING');
    }
    throw err;
  }
}

export async function getPendingByQuotationId(quotationId, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.quotationId, quotationId),
        eq(approvalRequests.status, 'PENDING')
      )
    )
    .limit(1);
  return rows[0] || null;
}

export async function lockById(id, tx) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, id))
    .for('update');
  return rows[0] || null;
}

export async function findByIdJoined(id) {
  const db = getDb();
  const rows = await db
    .select({
      request: approvalRequests,
      quotation: quotations,
      customerName: customers.name,
      customerTier: customers.tier,
      requesterName: users.name,
      requesterEmail: users.email,
      requesterId: quotations.salesRepId,
      originType: quotations.originType,
    })
    .from(approvalRequests)
    .innerJoin(quotations, eq(quotations.id, approvalRequests.quotationId))
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .innerJoin(users, eq(users.id, quotations.salesRepId))
    .where(eq(approvalRequests.id, id))
    .limit(1);

  return rows[0] || null;
}

export async function findActions(requestId) {
  const db = getDb();
  return db
    .select({
      id: approvalActions.id,
      approvalRequestId: approvalActions.approvalRequestId,
      actorId: approvalActions.actorId,
      actorName: users.name,
      actorRole: users.role,
      level: approvalActions.level,
      action: approvalActions.action,
      reason: approvalActions.reason,
      createdAt: approvalActions.createdAt,
    })
    .from(approvalActions)
    .innerJoin(users, eq(users.id, approvalActions.actorId))
    .where(eq(approvalActions.approvalRequestId, requestId))
    .orderBy(asc(approvalActions.createdAt));
}

export async function listApprovalRequests({ role, repScope, status, offset = 0, limit = 20 } = {}) {
  const db = getDb();
  const conditions = [];

  if (status && status !== 'ALL') {
    conditions.push(eq(approvalRequests.status, status));
  }

  // Correlated subquery for whether Manager has approved
  const managerApprovedSql = sql`EXISTS (
    SELECT 1 FROM approval_actions
    WHERE approval_actions.approval_request_id = ${approvalRequests.id}
      AND approval_actions.level = 'MANAGER'
      AND approval_actions.action = 'APPROVED'
  )`;

  if (role === 'SALES_MANAGER') {
    conditions.push(
      or(
        eq(approvalRequests.requiredLevel, 'MANAGER'),
        and(
          eq(approvalRequests.requiredLevel, 'MANAGER_FINANCE'),
          sql`NOT ${managerApprovedSql}`
        )
      )
    );
    if (repScope && repScope.length > 0) {
      conditions.push(inArray(quotations.salesRepId, repScope));
    }
  } else if (role === 'SALES_REP') {
    if (repScope && repScope.length > 0) {
      conditions.push(inArray(quotations.salesRepId, repScope));
    }
  } else if (role === 'FINANCE') {
    conditions.push(
      and(
        eq(approvalRequests.requiredLevel, 'MANAGER_FINANCE'),
        managerApprovedSql
      )
    );
  }
  // ADMIN can view all approval requests

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: approvalRequests.id,
      quotationId: approvalRequests.quotationId,
      quoteNumber: quotations.quoteNumber,
      customerId: quotations.customerId,
      customerName: customers.name,
      customerTier: customers.tier,
      salesRepId: quotations.salesRepId,
      salesRepName: users.name,
      originType: quotations.originType,
      grandTotal: quotations.grandTotal,
      blendedRiskScore: approvalRequests.blendedRiskScore,
      requiredLevel: approvalRequests.requiredLevel,
      status: approvalRequests.status,
      requestedAt: approvalRequests.requestedAt,
      resolvedAt: approvalRequests.resolvedAt,
      currentStep: sql`CASE 
        WHEN ${approvalRequests.requiredLevel} = 'MANAGER' THEN 'MANAGER'
        WHEN ${managerApprovedSql} THEN 'FINANCE' 
        ELSE 'MANAGER' 
      END`,
    })
    .from(approvalRequests)
    .innerJoin(quotations, eq(quotations.id, approvalRequests.quotationId))
    .innerJoin(customers, eq(customers.id, quotations.customerId))
    .innerJoin(users, eq(users.id, quotations.salesRepId))
    .where(whereClause)
    .orderBy(desc(approvalRequests.requestedAt))
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql`count(*)` })
    .from(approvalRequests)
    .innerJoin(quotations, eq(quotations.id, approvalRequests.quotationId))
    .where(whereClause);

  return {
    rows,
    total: Number(countResult[0]?.count || 0),
  };
}

export async function insertAction(data, tx) {
  const db = tx || getDb();
  const rows = await db
    .insert(approvalActions)
    .values({
      approvalRequestId: data.approvalRequestId,
      actorId: data.actorId,
      level: data.level,
      action: data.action,
      reason: data.reason || null,
    })
    .returning();
  return rows[0];
}

export async function resolveRequest(id, status, tx) {
  const db = tx || getDb();
  const rows = await db
    .update(approvalRequests)
    .set({
      status,
      resolvedAt: new Date(),
    })
    .where(eq(approvalRequests.id, id))
    .returning();
  return rows[0];
}

export async function insertAuditLog(entry, tx) {
  const db = tx || getDb();
  return db.insert(auditLogs).values({
    actorId: entry.actorId,
    entityType: entry.entityType || 'QUOTATION',
    entityId: entry.entityId,
    action: entry.action,
    reason: entry.reason || null,
    oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
    newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
  });
}

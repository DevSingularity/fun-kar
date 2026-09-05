import { query, queryOne } from '../../config/database.js';
import { ConflictError } from '../../common/errors.js';

export async function createRequest(data, tx = undefined) {
  try {
    return await queryOne(
      `INSERT INTO approval_requests (quotation_id, blended_risk_score, required_level, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING *`,
      [data.quotationId, String(data.blendedRiskScore), data.requiredLevel],
      tx
    );
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('This quotation already has a pending approval request.', 'APPROVAL_ALREADY_PENDING');
    }
    throw err;
  }
}

export async function getPendingByQuotationId(quotationId, tx = undefined) {
  return await queryOne(
    `SELECT * FROM approval_requests
     WHERE quotation_id = $1 AND status = 'PENDING'
     LIMIT 1`,
    [quotationId],
    tx
  );
}

export async function lockById(id, tx) {
  return await queryOne(
    `SELECT * FROM approval_requests WHERE id = $1 FOR UPDATE`,
    [id],
    tx
  );
}

export async function findByIdJoined(id) {
  const sql = `
    SELECT
      ar.id AS ar_id,
      ar.quotation_id AS ar_quotation_id,
      ar.blended_risk_score AS ar_blended_risk_score,
      ar.required_level AS ar_required_level,
      ar.status AS ar_status,
      ar.requested_at AS ar_requested_at,
      ar.resolved_at AS ar_resolved_at,
      q.id AS q_id,
      q.quote_number AS q_quote_number,
      q.customer_id AS q_customer_id,
      q.sales_rep_id AS q_sales_rep_id,
      q.origin_type AS q_origin_type,
      q.status AS q_status,
      q.subtotal AS q_subtotal,
      q.discount_total AS q_discount_total,
      q.tax_total AS q_tax_total,
      q.grand_total AS q_grand_total,
      q.estimated_margin_pct AS q_estimated_margin_pct,
      q.required_approval_level AS q_required_approval_level,
      q.blended_risk_score AS q_blended_risk_score,
      q.submitted_at AS q_submitted_at,
      q.promised_delivery_date AS q_promised_delivery_date,
      q.last_activity_at AS q_last_activity_at,
      q.created_at AS q_created_at,
      q.updated_at AS q_updated_at,
      c.name AS customer_name,
      c.tier AS customer_tier,
      u.name AS requester_name,
      u.email AS requester_email,
      q.sales_rep_id AS requester_id,
      q.origin_type AS origin_type
    FROM approval_requests ar
    INNER JOIN quotations q ON q.id = ar.quotation_id
    INNER JOIN customers c ON c.id = q.customer_id
    INNER JOIN users u ON u.id = q.sales_rep_id
    WHERE ar.id = $1
    LIMIT 1
  `;

  const row = await queryOne(sql, [id]);
  if (!row) return null;

  return {
    request: {
      id: row.arId,
      quotationId: row.arQuotationId,
      blendedRiskScore: row.arBlendedRiskScore,
      requiredLevel: row.arRequiredLevel,
      status: row.arStatus,
      requestedAt: row.arRequestedAt,
      resolvedAt: row.arResolvedAt,
    },
    quotation: {
      id: row.qId,
      quoteNumber: row.qQuoteNumber,
      customerId: row.qCustomerId,
      salesRepId: row.qSalesRepId,
      originType: row.qOriginType,
      status: row.qStatus,
      subtotal: row.qSubtotal,
      discountTotal: row.qDiscountTotal,
      taxTotal: row.qTaxTotal,
      grandTotal: row.qGrandTotal,
      estimatedMarginPct: row.qEstimatedMarginPct,
      requiredApprovalLevel: row.qRequiredApprovalLevel,
      blendedRiskScore: row.qBlendedRiskScore,
      submittedAt: row.qSubmittedAt,
      promisedDeliveryDate: row.qPromisedDeliveryDate,
      lastActivityAt: row.qLastActivityAt,
      createdAt: row.qCreatedAt,
      updatedAt: row.qUpdatedAt,
    },
    customerName: row.customerName,
    customerTier: row.customerTier,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    requesterId: row.requesterId,
    originType: row.originType,
  };
}

export async function findActions(requestId) {
  return await query(
    `SELECT
       aa.id,
       aa.approval_request_id,
       aa.actor_id,
       u.name AS actor_name,
       u.role AS actor_role,
       aa.level,
       aa.action,
       aa.reason,
       aa.created_at
     FROM approval_actions aa
     INNER JOIN users u ON u.id = aa.actor_id
     WHERE aa.approval_request_id = $1
     ORDER BY aa.created_at ASC`,
    [requestId]
  );
}

export async function listApprovalRequests({ role, repScope, status, offset = 0, limit = 20 } = {}) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (status && status !== 'ALL') {
    whereClauses.push(`ar.status = $${idx++}`);
    params.push(status);
  }

  const managerApprovedSql = `EXISTS (
    SELECT 1 FROM approval_actions
    WHERE approval_actions.approval_request_id = ar.id
      AND approval_actions.level = 'MANAGER'
      AND approval_actions.action = 'APPROVED'
  )`;

  if (role === 'SALES_MANAGER') {
    whereClauses.push(`(
      ar.required_level = 'MANAGER'
      OR (ar.required_level = 'MANAGER_FINANCE' AND NOT (${managerApprovedSql}))
    )`);
    if (repScope && repScope.length > 0) {
      whereClauses.push(`q.sales_rep_id = ANY($${idx++}::uuid[])`);
      params.push(repScope);
    }
  } else if (role === 'SALES_REP') {
    if (repScope && repScope.length > 0) {
      whereClauses.push(`q.sales_rep_id = ANY($${idx++}::uuid[])`);
      params.push(repScope);
    }
  } else if (role === 'FINANCE') {
    whereClauses.push(`(
      (ar.required_level = 'MANAGER_FINANCE' AND (${managerApprovedSql}))
      OR (ar.required_level = 'MANAGER_FINANCE' AND ar.status != 'PENDING')
    )`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT count(*)::int AS count
     FROM approval_requests ar
     INNER JOIN quotations q ON q.id = ar.quotation_id
     INNER JOIN customers c ON c.id = q.customer_id
     INNER JOIN users u ON u.id = q.sales_rep_id
     ${whereSql}`,
    params
  );
  const total = countRow?.count || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT
       ar.id,
       ar.quotation_id,
       q.quote_number,
       q.customer_id,
       c.name AS customer_name,
       c.tier AS customer_tier,
       q.sales_rep_id,
       u.name AS sales_rep_name,
       q.origin_type,
       q.grand_total,
       ar.blended_risk_score,
       ar.required_level,
       ar.status,
       ar.requested_at,
       ar.resolved_at,
       CASE
         WHEN ar.required_level = 'MANAGER' THEN 'MANAGER'
         WHEN (${managerApprovedSql}) THEN 'FINANCE'
         ELSE 'MANAGER'
       END AS current_step
     FROM approval_requests ar
     INNER JOIN quotations q ON q.id = ar.quotation_id
     INNER JOIN customers c ON c.id = q.customer_id
     INNER JOIN users u ON u.id = q.sales_rep_id
     ${whereSql}
     ORDER BY ar.requested_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return {
    rows,
    total,
  };
}

export async function insertAction(data, tx) {
  return await queryOne(
    `INSERT INTO approval_actions (approval_request_id, actor_id, level, action, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.approvalRequestId,
      data.actorId,
      data.level,
      data.action,
      data.reason || null,
    ],
    tx
  );
}

export async function resolveRequest(id, status, tx) {
  return await queryOne(
    `UPDATE approval_requests
     SET status = $2, resolved_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status],
    tx
  );
}

export async function insertAuditLog(entry, tx) {
  return await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.actorId,
      entry.entityType || 'QUOTATION',
      entry.entityId,
      entry.action,
      entry.reason || null,
      entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
    ],
    tx
  );
}

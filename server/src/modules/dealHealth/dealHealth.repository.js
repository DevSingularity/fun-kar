import { query, queryOne } from '../../config/database.js';

export async function listAlerts({ repScope, status, offset = 0, limit = 50 }) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (status) {
    whereClauses.push(`da.status = $${idx++}`);
    params.push(status);
  }
  if (repScope && repScope.length > 0) {
    whereClauses.push(`q.sales_rep_id = ANY($${idx++}::uuid[])`);
    params.push(repScope);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const dataParams = [...params, limit, offset];
  return await query(
    `SELECT
       da.id,
       da.quotation_id,
       q.quote_number,
       c.name AS customer_name,
       c.tier AS customer_tier,
       q.sales_rep_id,
       u.name AS sales_rep_name,
       da.alert_type,
       da.severity,
       da.message,
       da.status,
       q.grand_total,
       q.subtotal,
       q.discount_total,
       q.estimated_margin_pct,
       q.promised_delivery_date,
       q.last_activity_at,
       da.created_at,
       da.resolved_at
     FROM deal_alerts da
     LEFT JOIN quotations q ON q.id = da.quotation_id
     LEFT JOIN customers c ON c.id = q.customer_id
     LEFT JOIN users u ON u.id = q.sales_rep_id
     ${whereSql}
     ORDER BY da.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );
}

export async function listScopedQuotations(repScope) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (repScope && repScope.length > 0) {
    whereClauses.push(`q.sales_rep_id = ANY($${idx++}::uuid[])`);
    params.push(repScope);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  return await query(
    `SELECT
       q.id,
       q.quote_number,
       q.status,
       q.customer_id,
       c.name AS customer_name,
       c.tier AS customer_tier,
       c.email AS customer_email,
       q.sales_rep_id,
       u.name AS sales_rep_name,
       q.subtotal,
       q.discount_total,
       q.tax_total,
       q.grand_total,
       q.estimated_margin_pct,
       q.required_approval_level,
       q.promised_delivery_date,
       q.last_activity_at,
       q.created_at
     FROM quotations q
     LEFT JOIN customers c ON q.customer_id = c.id
     LEFT JOIN users u ON q.sales_rep_id = u.id
     ${whereSql}
     ORDER BY q.last_activity_at DESC`,
    params
  );
}

export async function findQuotationOwnerRep(quotationId) {
  const row = await queryOne(
    `SELECT sales_rep_id FROM quotations WHERE id = $1`,
    [quotationId]
  );
  return row?.salesRepId || null;
}

export async function findFullQuotation(quotationId) {
  const quote = await queryOne(
    `SELECT
       q.id,
       q.quote_number,
       q.status,
       q.origin_type,
       q.customer_id,
       c.name AS customer_name,
       c.email AS customer_email,
       c.phone AS customer_phone,
       c.tier AS customer_tier,
       c.billing_address AS customer_billing_address,
       q.sales_rep_id,
       u.name AS sales_rep_name,
       u.email AS sales_rep_email,
       q.subtotal,
       q.discount_total,
       q.tax_total,
       q.grand_total,
       q.estimated_margin_pct,
       q.required_approval_level,
       q.promised_delivery_date,
       q.last_activity_at,
       q.created_at,
       q.updated_at
     FROM quotations q
     LEFT JOIN customers c ON q.customer_id = c.id
     LEFT JOIN users u ON q.sales_rep_id = u.id
     WHERE q.id = $1`,
    [quotationId]
  );

  if (!quote) return null;

  const items = await query(
    `SELECT
       qi.id,
       qi.product_id,
       p.name AS product_name,
       p.sku AS product_sku,
       pc.name AS category_name,
       p.unit,
       qi.quantity,
       qi.unit_price,
       qi.discount_pct,
       qi.discount_amount,
       qi.tax_amount,
       qi.line_total,
       qi.estimated_cost
     FROM quotation_items qi
     LEFT JOIN products p ON qi.product_id = p.id
     LEFT JOIN product_categories pc ON p.category_id = pc.id
     WHERE qi.quotation_id = $1`,
    [quotationId]
  );

  return { ...quote, items };
}

export async function listAlertsForQuotation(quotationId) {
  return await query(
    `SELECT * FROM deal_alerts WHERE quotation_id = $1 ORDER BY created_at DESC`,
    [quotationId]
  );
}

export async function findAlertById(alertId) {
  return await queryOne(
    `SELECT * FROM deal_alerts WHERE id = $1`,
    [alertId]
  );
}

export async function updateAlertStatus(alertId, status, resolvedBy) {
  const isTerminal = status === 'RESOLVED' || status === 'DISMISSED';
  return await queryOne(
    `UPDATE deal_alerts
     SET status = $2,
         resolved_by = $3,
         resolved_at = $4
     WHERE id = $1
     RETURNING *`,
    [alertId, status, resolvedBy, isTerminal ? new Date() : null]
  );
}

export async function createAlert(data) {
  return await queryOne(
    `INSERT INTO deal_alerts (quotation_id, alert_type, severity, message, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.quotationId,
      data.alertType,
      data.severity || 'MEDIUM',
      data.message,
      data.status || 'OPEN',
    ]
  );
}

export async function getTimeline(quotationId) {
  const [comments, requests] = await Promise.all([
    query(
      `SELECT id, message, author_type, created_at
       FROM negotiation_comments
       WHERE quotation_id = $1
       ORDER BY created_at DESC`,
      [quotationId]
    ),
    query(
      `SELECT id, message, request_type, status, created_at
       FROM negotiation_requests
       WHERE quotation_id = $1
       ORDER BY created_at DESC`,
      [quotationId]
    ),
  ]);

  const timeline = [
    ...comments.map((c) => ({ ...c, kind: 'COMMENT' })),
    ...requests.map((r) => ({ ...r, kind: 'REQUEST' })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return timeline;
}

export async function addTimelineComment({ quotationId, authorId, message, authorType = 'INTERNAL' }) {
  return await queryOne(
    `INSERT INTO negotiation_comments (quotation_id, author_id, author_type, message)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [quotationId, authorId || null, authorType, message]
  );
}

export async function insertAuditLog(entry) {
  return await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, new_value)
     VALUES ($1, 'QUOTATION', $2, $3, $4, $5)`,
    [
      entry.actorId || null,
      entry.entityId,
      entry.action,
      entry.reason || null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
    ]
  );
}

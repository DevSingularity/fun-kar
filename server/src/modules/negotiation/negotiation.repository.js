import { query, queryOne } from '../../config/database.js';

export async function insertRequest(data) {
  return await queryOne(
    `INSERT INTO negotiation_requests (
       quotation_id, quotation_item_id, customer_user_id, request_type, message, requested_discount_pct, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7
     ) RETURNING *`,
    [
      data.quotationId,
      data.quotationItemId || null,
      data.customerUserId,
      data.requestType,
      data.message,
      data.requestedDiscountPct ?? null,
      data.status || 'OPEN',
    ]
  );
}

export async function insertComment(data) {
  return await queryOne(
    `INSERT INTO negotiation_comments (
       negotiation_request_id, quotation_id, quotation_item_id, author_type,
       author_user_id, author_customer_user_id, message
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7
     ) RETURNING *`,
    [
      data.negotiationRequestId || null,
      data.quotationId,
      data.quotationItemId || null,
      data.authorType,
      data.authorUserId || null,
      data.authorCustomerUserId || null,
      data.message,
    ]
  );
}

export async function findRequestById(id) {
  return await queryOne(
    `SELECT * FROM negotiation_requests WHERE id = $1`,
    [id]
  );
}

export async function updateRequest(id, data) {
  const setParts = [];
  const params = [id];
  let idx = 2;

  if (data.status !== undefined) {
    setParts.push(`status = $${idx++}`);
    params.push(data.status);
  }
  if (data.resolvedBy !== undefined) {
    setParts.push(`resolved_by = $${idx++}`);
    params.push(data.resolvedBy);
  }
  if (data.resolutionNote !== undefined) {
    setParts.push(`resolution_note = $${idx++}`);
    params.push(data.resolutionNote);
  }
  if (data.resolvedAt !== undefined) {
    setParts.push(`resolved_at = $${idx++}`);
    params.push(data.resolvedAt);
  }

  if (setParts.length === 0) return await findRequestById(id);

  return await queryOne(
    `UPDATE negotiation_requests
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );
}

export async function findItemInQuotation(quotationItemId, quotationId) {
  return await queryOne(
    `SELECT * FROM quotation_items
     WHERE id = $1 AND quotation_id = $2`,
    [quotationItemId, quotationId]
  );
}

export async function listRequests(quotationId, { status, offset, limit }) {
  const whereClauses = [`quotation_id = $1`];
  const params = [quotationId];
  let idx = 2;

  if (status) {
    whereClauses.push(`status = $${idx++}`);
    params.push(status);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const countRow = await queryOne(
    `SELECT count(*)::int AS count FROM negotiation_requests ${whereSql}`,
    params
  );
  const count = countRow?.count || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT * FROM negotiation_requests
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return { rows, count };
}

export async function timelineRows(quotationId) {
  const requests = await query(
    `SELECT * FROM negotiation_requests WHERE quotation_id = $1`,
    [quotationId]
  );

  const comments = await query(
    `SELECT * FROM negotiation_comments WHERE quotation_id = $1`,
    [quotationId]
  );

  return { requests, comments };
}

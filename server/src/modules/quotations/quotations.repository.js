import { query, queryOne } from '../../config/database.js';

export async function lockById(id, tx = undefined) {
  return await queryOne(
    `SELECT * FROM quotations WHERE id = $1 LIMIT 1`,
    [id],
    tx
  );
}

export async function insertHeader(data, tx = undefined) {
  return await queryOne(
    `INSERT INTO quotations (
       quote_number,
       customer_id,
       sales_rep_id,
       promised_delivery_date,
       status,
       subtotal,
       discount_total,
       tax_total,
       grand_total,
       required_approval_level
     ) VALUES (
       $1, $2, $3, $4, 'DRAFT', '0.00', '0.00', '0.00', '0.00', 'NONE'
     ) RETURNING *`,
    [
      data.quoteNumber,
      data.customerId,
      data.salesRepId,
      data.promisedDeliveryDate || null,
    ],
    tx
  );
}

export async function findByIdJoined(id) {
  const sql = `
    SELECT
      q.id,
      q.quote_number,
      q.customer_id,
      q.sales_rep_id,
      q.origin_type,
      q.status,
      q.subtotal,
      q.discount_total,
      q.tax_total,
      q.grand_total,
      q.estimated_margin_pct,
      q.required_approval_level,
      q.blended_risk_score,
      q.submitted_at,
      q.promised_delivery_date,
      q.last_activity_at,
      q.created_at,
      q.updated_at,
      c.name AS customer_name,
      c.email AS customer_email,
      c.tier AS customer_tier,
      c.billing_address AS customer_billing_address,
      u.name AS sales_rep_name,
      u.email AS sales_rep_email
    FROM quotations q
    INNER JOIN customers c ON c.id = q.customer_id
    INNER JOIN users u ON u.id = q.sales_rep_id
    WHERE q.id = $1
    LIMIT 1
  `;

  const row = await queryOne(sql, [id]);
  if (!row) return null;

  return {
    quotation: {
      id: row.id,
      quoteNumber: row.quoteNumber,
      customerId: row.customerId,
      salesRepId: row.salesRepId,
      originType: row.originType,
      status: row.status,
      subtotal: row.subtotal,
      discountTotal: row.discountTotal,
      taxTotal: row.taxTotal,
      grandTotal: row.grandTotal,
      estimatedMarginPct: row.estimatedMarginPct,
      requiredApprovalLevel: row.requiredApprovalLevel,
      blendedRiskScore: row.blendedRiskScore,
      submittedAt: row.submittedAt,
      promisedDeliveryDate: row.promisedDeliveryDate,
      lastActivityAt: row.lastActivityAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerTier: row.customerTier,
    customerBillingAddress: row.customerBillingAddress,
    salesRepName: row.salesRepName,
    salesRepEmail: row.salesRepEmail,
  };
}

export async function findItemsJoined(quotationId, tx = undefined) {
  const sql = `
    SELECT
      qi.id,
      qi.quotation_id,
      qi.product_id,
      qi.quantity,
      qi.unit_price,
      qi.allowed_discount_pct,
      qi.discount_pct,
      qi.discount_amount,
      qi.tax_amount,
      qi.line_total,
      qi.estimated_cost,
      qi.created_at,
      qi.updated_at,
      p.name AS product_name,
      p.sku AS product_sku,
      p.product_type AS product_type,
      p.unit AS unit,
      pc.name AS category_name
    FROM quotation_items qi
    INNER JOIN products p ON p.id = qi.product_id
    LEFT JOIN product_categories pc ON pc.id = p.category_id
    WHERE qi.quotation_id = $1
    ORDER BY qi.created_at ASC
  `;

  const rows = await query(sql, [quotationId], tx);

  return rows.map((row) => ({
    item: {
      id: row.id,
      quotationId: row.quotationId,
      productId: row.productId,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      allowedDiscountPct: row.allowedDiscountPct,
      discountPct: row.discountPct,
      discountAmount: row.discountAmount,
      taxAmount: row.taxAmount,
      lineTotal: row.lineTotal,
      estimatedCost: row.estimatedCost,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    productName: row.productName,
    productSku: row.productSku,
    categoryName: row.categoryName,
    productType: row.productType,
    unit: row.unit,
  }));
}

export async function findLatestApprovalRequest(quotationId) {
  return await queryOne(
    `SELECT * FROM approval_requests
     WHERE quotation_id = $1
     ORDER BY requested_at DESC
     LIMIT 1`,
    [quotationId]
  );
}

export async function listQuotations({ status, customerId, salesRepId, search, offset = 0, limit = 20 }) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (status) {
    whereClauses.push(`q.status = $${idx++}`);
    params.push(status);
  }
  if (customerId) {
    whereClauses.push(`q.customer_id = $${idx++}`);
    params.push(customerId);
  }
  if (Array.isArray(salesRepId) && salesRepId.length > 0) {
    whereClauses.push(`q.sales_rep_id = ANY($${idx++}::uuid[])`);
    params.push(salesRepId);
  } else if (salesRepId && !Array.isArray(salesRepId)) {
    whereClauses.push(`q.sales_rep_id = $${idx++}`);
    params.push(salesRepId);
  }
  if (search) {
    whereClauses.push(`q.quote_number ILIKE $${idx++}`);
    params.push(`%${search}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT count(*)::int AS total
     FROM quotations q
     INNER JOIN customers c ON c.id = q.customer_id
     INNER JOIN users u ON u.id = q.sales_rep_id
     ${whereSql}`,
    params
  );
  const total = countRow?.total || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT
       q.id,
       q.quote_number,
       q.customer_id,
       c.name AS customer_name,
       c.tier AS customer_tier,
       q.sales_rep_id,
       u.name AS sales_rep_name,
       q.origin_type,
       q.status,
       q.grand_total,
       q.subtotal,
       q.discount_total,
       q.estimated_margin_pct,
       q.required_approval_level,
       q.promised_delivery_date,
       q.last_activity_at,
       q.created_at
     FROM quotations q
     INNER JOIN customers c ON c.id = q.customer_id
     INNER JOIN users u ON u.id = q.sales_rep_id
     ${whereSql}
     ORDER BY q.last_activity_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return { items: rows, total };
}

export async function listForPipeline({ salesRepId } = {}) {
  const validStatuses = [
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'UNDER_NEGOTIATION',
    'CONFIRMED',
    'FULFILLING',
    'COMPLETED',
  ];

  const whereClauses = [`q.status::text = ANY($1::text[])`];
  const params = [validStatuses];
  let idx = 2;

  if (Array.isArray(salesRepId) && salesRepId.length > 0) {
    whereClauses.push(`q.sales_rep_id = ANY($${idx++}::uuid[])`);
    params.push(salesRepId);
  } else if (salesRepId && !Array.isArray(salesRepId)) {
    whereClauses.push(`q.sales_rep_id = $${idx++}`);
    params.push(salesRepId);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  return await query(
    `SELECT
       q.id,
       q.quote_number,
       q.status,
       q.grand_total,
       q.estimated_margin_pct,
       q.required_approval_level,
       q.last_activity_at,
       c.name AS customer_name,
       c.tier AS customer_tier,
       u.name AS sales_rep_name
     FROM quotations q
     INNER JOIN customers c ON c.id = q.customer_id
     INNER JOIN users u ON u.id = q.sales_rep_id
     ${whereSql}
     ORDER BY q.last_activity_at DESC`,
    params
  );
}

// Items Mutation
export async function insertItem(data, tx = undefined) {
  return await queryOne(
    `INSERT INTO quotation_items (
       quotation_id,
       product_id,
       quantity,
       unit_price,
       allowed_discount_pct,
       discount_pct,
       discount_amount,
       tax_amount,
       line_total,
       estimated_cost
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
     ) RETURNING *`,
    [
      data.quotationId,
      data.productId,
      data.quantity,
      String(data.unitPrice),
      String(data.allowedDiscountPct),
      String(data.discountPct),
      String(data.discountAmount),
      String(data.taxAmount),
      String(data.lineTotal),
      String(data.estimatedCost),
    ],
    tx
  );
}

export async function findItemById(id, tx = undefined) {
  return await queryOne(
    `SELECT * FROM quotation_items WHERE id = $1 LIMIT 1`,
    [id],
    tx
  );
}

export async function updateItem(id, data, tx = undefined) {
  const setParts = ['updated_at = NOW()'];
  const params = [id];
  let idx = 2;

  if (data.quantity !== undefined) {
    setParts.push(`quantity = $${idx++}`);
    params.push(data.quantity);
  }
  if (data.discountPct !== undefined) {
    setParts.push(`discount_pct = $${idx++}`);
    params.push(String(data.discountPct));
  }
  if (data.discountAmount !== undefined) {
    setParts.push(`discount_amount = $${idx++}`);
    params.push(String(data.discountAmount));
  }
  if (data.taxAmount !== undefined) {
    setParts.push(`tax_amount = $${idx++}`);
    params.push(String(data.taxAmount));
  }
  if (data.lineTotal !== undefined) {
    setParts.push(`line_total = $${idx++}`);
    params.push(String(data.lineTotal));
  }
  if (data.estimatedCost !== undefined) {
    setParts.push(`estimated_cost = $${idx++}`);
    params.push(String(data.estimatedCost));
  }

  return await queryOne(
    `UPDATE quotation_items
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params,
    tx
  );
}

export async function deleteItem(id, tx = undefined) {
  return await queryOne(
    `DELETE FROM quotation_items WHERE id = $1 RETURNING *`,
    [id],
    tx
  );
}

export async function applyAggregateTotals(id, totals, tx = undefined) {
  return await queryOne(
    `UPDATE quotations
     SET
       subtotal = $2,
       discount_total = $3,
       tax_total = $4,
       grand_total = $5,
       estimated_margin_pct = $6,
       last_activity_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      String(totals.subtotal),
      String(totals.discountTotal),
      String(totals.taxTotal),
      String(totals.grandTotal),
      String(totals.estimatedMarginPct),
    ],
    tx
  );
}

export async function updateHeaderFields(id, fields, tx = undefined) {
  const setParts = ['updated_at = NOW()', 'last_activity_at = NOW()'];
  const params = [id];
  let idx = 2;

  if (fields.customerId !== undefined) {
    setParts.push(`customer_id = $${idx++}`);
    params.push(fields.customerId);
  }
  if (fields.status !== undefined) {
    setParts.push(`status = $${idx++}`);
    params.push(fields.status);
  }
  if (fields.requiredApprovalLevel !== undefined) {
    setParts.push(`required_approval_level = $${idx++}`);
    params.push(fields.requiredApprovalLevel);
  }
  if (fields.blendedRiskScore !== undefined) {
    setParts.push(`blended_risk_score = $${idx++}`);
    params.push(String(fields.blendedRiskScore));
  }
  if (fields.promisedDeliveryDate !== undefined) {
    setParts.push(`promised_delivery_date = $${idx++}`);
    params.push(fields.promisedDeliveryDate);
  }
  if (fields.salesRepId !== undefined) {
    setParts.push(`sales_rep_id = $${idx++}`);
    params.push(fields.salesRepId);
  }

  return await queryOne(
    `UPDATE quotations
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params,
    tx
  );
}

export async function applySubmitResult(id, { status, blendedRiskScore, requiredApprovalLevel }, tx = undefined) {
  return await queryOne(
    `UPDATE quotations
     SET
       status = $2,
       blended_risk_score = $3,
       required_approval_level = $4,
       submitted_at = NOW(),
       last_activity_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, String(blendedRiskScore), requiredApprovalLevel],
    tx
  );
}

export async function deleteHeader(id, tx = undefined) {
  return await queryOne(
    `DELETE FROM quotations WHERE id = $1 RETURNING *`,
    [id],
    tx
  );
}

export async function insertAuditLog(entry, tx = undefined) {
  return await queryOne(
    `INSERT INTO audit_logs (
       actor_id, entity_type, entity_id, action, reason, old_value, new_value
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7
     ) RETURNING *`,
    [
      entry.actorId || null,
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.reason || null,
      entry.oldValue || null,
      entry.newValue || null,
    ],
    tx
  );
}

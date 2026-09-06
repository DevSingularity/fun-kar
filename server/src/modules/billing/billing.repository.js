import { query, queryOne } from '../../config/database.js';

// ---------- Sequences ----------

export async function nextInvoiceNumber(tx = undefined) {
  const year = new Date().getFullYear();
  try {
    const row = await queryOne(`SELECT nextval('invoice_number_seq') AS nextval`, [], tx);
    const nextVal = row?.nextval || 1;
    return `INV-${year}-${String(nextVal).padStart(6, '0')}`;
  } catch {
    await query(`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1`, [], tx);
    const row = await queryOne(`SELECT nextval('invoice_number_seq') AS nextval`, [], tx);
    const nextVal = row?.nextval || 1;
    return `INV-${year}-${String(nextVal).padStart(6, '0')}`;
  }
}

export async function nextCreditNoteNumber(tx = undefined) {
  const year = new Date().getFullYear();
  try {
    const row = await queryOne(`SELECT nextval('credit_note_number_seq') AS nextval`, [], tx);
    const nextVal = row?.nextval || 1;
    return `CN-${year}-${String(nextVal).padStart(6, '0')}`;
  } catch {
    await query(`CREATE SEQUENCE IF NOT EXISTS credit_note_number_seq START WITH 1 INCREMENT BY 1`, [], tx);
    const row = await queryOne(`SELECT nextval('credit_note_number_seq') AS nextval`, [], tx);
    const nextVal = row?.nextval || 1;
    return `CN-${year}-${String(nextVal).padStart(6, '0')}`;
  }
}

// ---------- Idempotency / order-level lookups ----------

export async function findOrderWithRep(orderId, tx = undefined) {
  const sql = `
    SELECT
      o.id,
      o.order_number,
      o.quotation_id,
      o.customer_id,
      o.status,
      o.subtotal,
      o.discount_total,
      o.tax_total,
      o.grand_total,
      o.promised_delivery_date,
      o.estimated_delivery_date,
      o.confirmed_at,
      o.created_at,
      o.updated_at,
      q.sales_rep_id,
      q.estimated_margin_pct
    FROM orders o
    INNER JOIN quotations q ON q.id = o.quotation_id
    WHERE o.id = $1
    LIMIT 1
  `;

  const row = await queryOne(sql, [orderId], tx);
  if (!row) return null;

  return {
    order: {
      id: row.id,
      orderNumber: row.orderNumber,
      quotationId: row.quotationId,
      customerId: row.customerId,
      status: row.status,
      subtotal: row.subtotal,
      discountTotal: row.discountTotal,
      taxTotal: row.taxTotal,
      grandTotal: row.grandTotal,
      estimatedMarginPct: row.estimatedMarginPct,
      promisedDeliveryDate: row.promisedDeliveryDate,
      estimatedDeliveryDate: row.estimatedDeliveryDate,
      confirmedAt: row.confirmedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    salesRepId: row.salesRepId,
    customerId: row.customerId,
  };
}

export async function findOrderItemsWithProduct(orderId, tx = undefined) {
  return await query(
    `SELECT
       oi.id,
       oi.product_id,
       p.name AS product_name,
       p.product_type,
       p.subscription_plan_id,
       oi.quantity,
       oi.unit_price,
       oi.discount_amount,
       oi.line_total,
       oi.billing_line_type
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [orderId],
    tx
  );
}

export async function findExistingOneTimeInvoice(orderId, tx = undefined) {
  return await queryOne(
    `SELECT * FROM invoices WHERE order_id = $1 AND invoice_type = 'ONE_TIME' LIMIT 1`,
    [orderId],
    tx
  );
}

export async function findSubscriptionLinesForOrder(orderId, tx = undefined) {
  const sql = `
    SELECT
      sl.id,
      sl.order_item_id,
      sl.subscription_plan_id,
      sl.quantity,
      sl.recurring_amount,
      sl.start_date,
      sl.end_date,
      sl.next_billing_date,
      sl.status,
      sl.created_at,
      sl.cancelled_at,
      oi.id AS oi_order_item_id
    FROM subscription_lines sl
    INNER JOIN order_items oi ON oi.id = sl.order_item_id
    WHERE oi.order_id = $1
  `;

  const rows = await query(sql, [orderId], tx);
  return rows.map((r) => ({
    line: {
      id: r.id,
      orderItemId: r.orderItemId,
      subscriptionPlanId: r.subscriptionPlanId,
      quantity: r.quantity,
      recurringAmount: r.recurringAmount,
      startDate: r.startDate,
      endDate: r.endDate,
      nextBillingDate: r.nextBillingDate,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: null,
      cancelledAt: r.cancelledAt,
    },
    orderItemId: r.oiOrderItemId,
  }));
}

// ---------- Invoice / invoice line / payment CRUD ----------

export async function insertInvoice(data, tx = undefined) {
  return await queryOne(
    `INSERT INTO invoices (
       invoice_number, order_id, customer_id, invoice_type, status,
       subtotal, tax_total, total, amount_paid, due_date, issued_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
     ) RETURNING *`,
    [
      data.invoiceNumber,
      data.orderId,
      data.customerId,
      data.invoiceType || 'ONE_TIME',
      data.status || 'DRAFT',
      String(data.subtotal || '0.00'),
      String(data.taxTotal || '0.00'),
      String(data.total || '0.00'),
      String(data.amountPaid || '0.00'),
      data.dueDate,
      data.issuedAt || null,
    ],
    tx
  );
}

export async function insertInvoiceLines(rows, tx = undefined) {
  if (rows.length === 0) return [];
  const inserted = [];
  for (const r of rows) {
    const row = await queryOne(
      `INSERT INTO invoice_lines (
         invoice_id, order_item_id, billing_schedule_id, description, amount
       ) VALUES (
         $1, $2, $3, $4, $5
       ) RETURNING *`,
      [
        r.invoiceId,
        r.orderItemId || null,
        r.billingScheduleId || null,
        r.description || 'Line item',
        String(r.amount || r.lineTotal || '0.00'),
      ],
      tx
    );
    inserted.push(row);
  }
  return inserted;
}

export async function updateInvoiceTotals(invoiceId, { subtotal, taxTotal, total }, tx = undefined) {
  return await queryOne(
    `UPDATE invoices
     SET subtotal = $2, tax_total = $3, total = $4
     WHERE id = $1
     RETURNING *`,
    [invoiceId, String(subtotal), String(taxTotal), String(total)],
    tx
  );
}

export async function findOpenRecurringInvoice(orderId, tx = undefined) {
  return await queryOne(
    `SELECT * FROM invoices
     WHERE order_id = $1 AND invoice_type = 'RECURRING' AND status = 'DRAFT'
     ORDER BY created_at DESC
     LIMIT 1`,
    [orderId],
    tx
  );
}

export async function findInvoiceByIdFull(id) {
  const sql = `
    SELECT
      i.id,
      i.invoice_number,
      i.order_id,
      i.customer_id,
      i.invoice_type,
      i.status,
      i.subtotal,
      i.tax_total,
      i.total,
      i.amount_paid,
      i.due_date,
      i.issued_at,
      i.created_at,
      c.name AS customer_name,
      c.tier AS customer_tier,
      o.order_number,
      q.sales_rep_id
    FROM invoices i
    INNER JOIN orders o ON o.id = i.order_id
    INNER JOIN customers c ON c.id = i.customer_id
    INNER JOIN quotations q ON q.id = o.quotation_id
    WHERE i.id = $1
    LIMIT 1
  `;

  const header = await queryOne(sql, [id]);
  if (!header) return null;

  const lines = await query(
    `SELECT * FROM invoice_lines WHERE invoice_id = $1`,
    [id]
  );

  const paymentRows = await query(
    `SELECT * FROM payments WHERE invoice_id = $1`,
    [id]
  );

  return {
    invoice: {
      id: header.id,
      invoiceNumber: header.invoiceNumber,
      orderId: header.orderId,
      customerId: header.customerId,
      invoiceType: header.invoiceType,
      status: header.status,
      subtotal: header.subtotal,
      taxTotal: header.taxTotal,
      total: header.total,
      amountPaid: header.amountPaid,
      dueDate: header.dueDate,
      issuedAt: header.issuedAt,
      paidAt: null,
      createdAt: header.createdAt,
      updatedAt: null,
    },
    customerName: header.customerName,
    customerTier: header.customerTier,
    orderNumber: header.orderNumber,
    salesRepId: header.salesRepId,
    lines,
    payments: paymentRows,
  };
}

export async function listInvoices({ status, invoiceType, customerId, salesRepId, offset = 0, limit = 20 } = {}) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (status) {
    whereClauses.push(`i.status = $${idx++}`);
    params.push(status);
  }
  if (invoiceType) {
    whereClauses.push(`i.invoice_type = $${idx++}`);
    params.push(invoiceType);
  }
  if (customerId) {
    whereClauses.push(`i.customer_id = $${idx++}`);
    params.push(customerId);
  }
  if (Array.isArray(salesRepId) && salesRepId.length > 0) {
    whereClauses.push(`q.sales_rep_id = ANY($${idx++}::uuid[])`);
    params.push(salesRepId);
  } else if (salesRepId && !Array.isArray(salesRepId)) {
    whereClauses.push(`q.sales_rep_id = $${idx++}`);
    params.push(salesRepId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT count(*)::int AS total
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN customers c ON c.id = i.customer_id
     INNER JOIN quotations q ON q.id = o.quotation_id
     ${whereSql}`,
    params
  );
  const total = countRow?.total || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT
       i.id,
       i.invoice_number,
       i.order_id,
       o.order_number,
       i.customer_id,
       c.name AS customer_name,
       i.invoice_type,
       i.status,
       i.subtotal,
       i.tax_total,
       i.total,
       i.amount_paid,
       i.due_date,
       i.issued_at,
       i.created_at
     FROM invoices i
     INNER JOIN orders o ON o.id = i.order_id
     INNER JOIN customers c ON c.id = i.customer_id
     INNER JOIN quotations q ON q.id = o.quotation_id
     ${whereSql}
     ORDER BY i.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return { rows, total };
}

// ---------- Subscription lines & billing schedules ----------

export async function insertSubscriptionLine(data, tx = undefined) {
  return await queryOne(
    `INSERT INTO subscription_lines (
       order_item_id, subscription_plan_id, quantity, recurring_amount,
       start_date, end_date, next_billing_date, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8
     ) RETURNING *`,
    [
      data.orderItemId,
      data.subscriptionPlanId,
      data.quantity,
      String(data.recurringAmount),
      data.startDate,
      data.endDate || null,
      data.nextBillingDate,
      data.status || 'ACTIVE',
    ],
    tx
  );
}

export async function insertBillingSchedule(data, tx = undefined) {
  return await queryOne(
    `INSERT INTO billing_schedules (
       subscription_line_id, invoice_id, billing_period_start, billing_period_end,
       status, amount
     ) VALUES (
       $1, $2, $3, $4, $5, $6
     ) RETURNING *`,
    [
      data.subscriptionLineId,
      data.invoiceId || null,
      data.billingPeriodStart,
      data.billingPeriodEnd,
      data.status || 'SCHEDULED',
      String(data.amount || data.scheduledAmount || '0.00'),
    ],
    tx
  );
}

export async function listSubscriptionLines({ status, customerId, search, offset = 0, limit = 50 } = {}) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (status && status !== 'ALL') {
    whereClauses.push(`sl.status = $${idx++}`);
    params.push(status);
  }
  if (customerId) {
    whereClauses.push(`o.customer_id = $${idx++}`);
    params.push(customerId);
  }
  if (search) {
    whereClauses.push(`(
      LOWER(p.name) LIKE $${idx}
      OR LOWER(c.name) LIKE $${idx}
      OR LOWER(sp.name) LIKE $${idx}
    )`);
    params.push(`%${search.toLowerCase()}%`);
    idx++;
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT count(*)::int AS count
     FROM subscription_lines sl
     INNER JOIN subscription_plans sp ON sp.id = sl.subscription_plan_id
     INNER JOIN order_items oi ON oi.id = sl.order_item_id
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN orders o ON o.id = oi.order_id
     INNER JOIN customers c ON c.id = o.customer_id
     INNER JOIN quotations q ON q.id = o.quotation_id
     ${whereSql}`,
    params
  );
  const count = countRow?.count || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT
       sl.id,
       sl.order_item_id,
       oi.order_id,
       o.order_number,
       o.customer_id,
       c.name AS customer_name,
       c.tier AS customer_tier,
       q.quote_number,
       oi.product_id,
       p.name AS product_name,
       sl.subscription_plan_id,
       sp.name AS plan_name,
       sp.frequency,
       sl.quantity,
       sl.recurring_amount,
       sl.start_date,
       sl.end_date,
       sl.next_billing_date,
       sl.status,
       sl.created_at,
       sl.cancelled_at
     FROM subscription_lines sl
     INNER JOIN subscription_plans sp ON sp.id = sl.subscription_plan_id
     INNER JOIN order_items oi ON oi.id = sl.order_item_id
     INNER JOIN products p ON p.id = oi.product_id
     INNER JOIN orders o ON o.id = oi.order_id
     INNER JOIN customers c ON c.id = o.customer_id
     INNER JOIN quotations q ON q.id = o.quotation_id
     ${whereSql}
     ORDER BY sl.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  const statusCountsRes = await query(
    `SELECT status, count(*)::int AS count FROM subscription_lines GROUP BY status`
  );

  const statusCounts = { ACTIVE: 0, PAUSED: 0, CANCELLED: 0 };
  for (const sc of statusCountsRes) {
    statusCounts[sc.status] = Number(sc.count || 0);
  }

  return { items: rows, total: count, statusCounts };
}

export async function findSubscriptionLineById(id, tx = undefined) {
  const sql = `
    SELECT
      sl.id,
      sl.order_item_id,
      sl.subscription_plan_id,
      sl.quantity,
      sl.recurring_amount,
      sl.start_date,
      sl.end_date,
      sl.next_billing_date,
      sl.status,
      sl.created_at,
      sl.cancelled_at,
      sp.id AS sp_id,
      sp.name AS sp_name,
      sp.frequency AS sp_frequency,
      sp.price AS sp_price,
      sp.cancellation_notice_days AS sp_cancellation_notice_days,
      oi.order_id,
      oi.id AS oi_id,
      p.id AS product_id,
      p.name AS product_name,
      q.sales_rep_id
    FROM subscription_lines sl
    INNER JOIN subscription_plans sp ON sp.id = sl.subscription_plan_id
    INNER JOIN order_items oi ON oi.id = sl.order_item_id
    INNER JOIN products p ON p.id = oi.product_id
    INNER JOIN orders o ON o.id = oi.order_id
    INNER JOIN quotations q ON q.id = o.quotation_id
    WHERE sl.id = $1
    LIMIT 1
  `;

  const row = await queryOne(sql, [id], tx);
  if (!row) return null;

  return {
    line: {
      id: row.id,
      orderItemId: row.orderItemId,
      subscriptionPlanId: row.subscriptionPlanId,
      quantity: row.quantity,
      recurringAmount: row.recurringAmount,
      startDate: row.startDate,
      endDate: row.endDate,
      nextBillingDate: row.nextBillingDate,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: null,
      cancelledAt: row.cancelledAt,
    },
    plan: {
      id: row.spId,
      name: row.spName,
      frequency: row.spFrequency,
      price: row.spPrice,
      cancellationNoticeDays: row.spCancellationNoticeDays,
    },
    orderId: row.orderId,
    productId: row.productId,
    productName: row.productName,
    salesRepId: row.salesRepId,
  };
}

export async function findSubscriptionDetailFull(id) {
  const sql = `
    SELECT
      sl.id,
      sl.order_item_id,
      oi.order_id,
      o.order_number,
      o.customer_id,
      c.name AS customer_name,
      c.email AS customer_email,
      c.tier AS customer_tier,
      q.quote_number,
      q.sales_rep_id,
      oi.product_id,
      p.name AS product_name,
      p.sku AS product_sku,
      sl.subscription_plan_id,
      sp.name AS plan_name,
      sp.frequency,
      sp.price AS plan_price,
      sp.cancellation_notice_days,
      sl.quantity,
      sl.recurring_amount,
      sl.start_date,
      sl.end_date,
      sl.next_billing_date,
      sl.status,
      sl.created_at,
      sl.cancelled_at
    FROM subscription_lines sl
    INNER JOIN subscription_plans sp ON sp.id = sl.subscription_plan_id
    INNER JOIN order_items oi ON oi.id = sl.order_item_id
    INNER JOIN products p ON p.id = oi.product_id
    INNER JOIN orders o ON o.id = oi.order_id
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN quotations q ON q.id = o.quotation_id
    WHERE sl.id = $1
    LIMIT 1
  `;

  const header = await queryOne(sql, [id]);
  if (!header) return null;

  const schedules = await query(
    `SELECT * FROM billing_schedules
     WHERE subscription_line_id = $1
     ORDER BY billing_period_start DESC`,
    [id]
  );

  const creditNotes = await query(
    `SELECT * FROM credit_notes
     WHERE subscription_line_id = $1
     ORDER BY issued_at DESC`,
    [id]
  );

  // Fetch originating order one-time lines & all recurring lines
  const orderLines = await query(
    `SELECT
       oi.id,
       oi.product_id,
       p.name AS product_name,
       p.sku,
       oi.quantity,
       oi.unit_price,
       oi.discount_pct,
       oi.discount_amount,
       oi.line_total,
       oi.billing_line_type
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [header.orderId]
  );

  const oneTimeLines = orderLines.filter((l) => l.billingLineType === 'ONE_TIME');

  const recurringLines = await query(
    `SELECT
       sl.id,
       sl.order_item_id,
       sp.name AS plan_name,
       sp.frequency,
       sl.next_billing_date,
       sl.recurring_amount,
       sl.quantity,
       sl.status,
       sl.start_date,
       p.name AS product_name
     FROM subscription_lines sl
     INNER JOIN subscription_plans sp ON sp.id = sl.subscription_plan_id
     INNER JOIN order_items oi ON oi.id = sl.order_item_id
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1`,
    [header.orderId]
  );

  return {
    ...header,
    schedules,
    creditNotes,
    oneTimeLines,
    recurringLines,
  };
}

export async function findScheduleById(id, tx = undefined) {
  return await queryOne(
    `SELECT * FROM billing_schedules WHERE id = $1 LIMIT 1`,
    [id],
    tx
  );
}

export async function findCurrentScheduleForLine(subscriptionLineId, tx = undefined) {
  return await queryOne(
    `SELECT * FROM billing_schedules
     WHERE subscription_line_id = $1 AND status = 'SCHEDULED'
     ORDER BY billing_period_start ASC
     LIMIT 1`,
    [subscriptionLineId],
    tx
  );
}

export async function updateSubscriptionLine(id, data, tx = undefined) {
  const setParts = [];
  const params = [id];
  let idx = 2;

  if (data.status !== undefined) {
    setParts.push(`status = $${idx++}`);
    params.push(data.status);
  }
  if (data.quantity !== undefined) {
    setParts.push(`quantity = $${idx++}`);
    params.push(data.quantity);
  }
  if (data.recurringAmount !== undefined) {
    setParts.push(`recurring_amount = $${idx++}`);
    params.push(String(data.recurringAmount));
  }
  if (data.subscriptionPlanId !== undefined) {
    setParts.push(`subscription_plan_id = $${idx++}`);
    params.push(data.subscriptionPlanId);
  }
  if (data.nextBillingDate !== undefined) {
    setParts.push(`next_billing_date = $${idx++}`);
    params.push(data.nextBillingDate);
  }
  if (data.cancelledAt !== undefined) {
    setParts.push(`cancelled_at = $${idx++}`);
    params.push(data.cancelledAt);
  }
  if (data.endDate !== undefined) {
    setParts.push(`end_date = $${idx++}`);
    params.push(data.endDate);
  }

  if (setParts.length === 0) {
    return await queryOne(`SELECT * FROM subscription_lines WHERE id = $1`, [id], tx);
  }

  return await queryOne(
    `UPDATE subscription_lines
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params,
    tx
  );
}

export async function updateOrderItemProduct(orderItemId, productId, tx = undefined) {
  return await queryOne(
    `UPDATE order_items
     SET product_id = $2
     WHERE id = $1
     RETURNING *`,
    [orderItemId, productId],
    tx
  );
}

export async function updateScheduleStatus(id, data, tx = undefined) {
  const setParts = [];
  const params = [id];
  let idx = 2;

  if (data.status !== undefined) {
    setParts.push(`status = $${idx++}`);
    params.push(data.status);
  }
  if (data.invoiceId !== undefined) {
    setParts.push(`invoice_id = $${idx++}`);
    params.push(data.invoiceId);
  }

  if (setParts.length === 0) {
    return await queryOne(`SELECT * FROM billing_schedules WHERE id = $1`, [id], tx);
  }

  return await queryOne(
    `UPDATE billing_schedules
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params,
    tx
  );
}

export async function findDueSchedules({ asOfDate, limit = 50 } = {}) {
  const sql = `
    SELECT
      bs.id AS bs_id,
      bs.subscription_line_id AS bs_subscription_line_id,
      bs.invoice_id AS bs_invoice_id,
      bs.billing_period_start AS bs_billing_period_start,
      bs.billing_period_end AS bs_billing_period_end,
      bs.status AS bs_status,
      bs.amount AS bs_scheduled_amount,
      bs.created_at AS bs_created_at,
      sl.id AS subscription_line_id,
      oi.order_id,
      p.name AS product_name,
      c.name AS customer_name,
      q.quote_number
    FROM billing_schedules bs
    INNER JOIN subscription_lines sl ON sl.id = bs.subscription_line_id
    INNER JOIN order_items oi ON oi.id = sl.order_item_id
    INNER JOIN orders o ON o.id = oi.order_id
    INNER JOIN products p ON p.id = oi.product_id
    INNER JOIN customers c ON c.id = o.customer_id
    INNER JOIN quotations q ON q.id = o.quotation_id
    WHERE bs.status = 'SCHEDULED' AND bs.billing_period_start <= $1
    ORDER BY bs.billing_period_start ASC
    LIMIT $2
  `;

  const rows = await query(sql, [asOfDate, limit]);
  return rows.map((r) => ({
    schedule: {
      id: r.bsId,
      subscriptionLineId: r.bsSubscriptionLineId,
      invoiceId: r.bsInvoiceId,
      billingPeriodStart: r.bsBillingPeriodStart,
      billingPeriodEnd: r.bsBillingPeriodEnd,
      status: r.bsStatus,
      scheduledAmount: r.bsScheduledAmount,
      createdAt: r.bsCreatedAt,
      updatedAt: null,
    },
    subscriptionLineId: r.subscriptionLineId,
    orderId: r.orderId,
    productName: r.productName,
    customerName: r.customerName,
    quoteNumber: r.quoteNumber,
  }));
}

// ---------- Credit notes ----------

export async function insertCreditNote(data, tx = undefined) {
  return await queryOne(
    `INSERT INTO credit_notes (
       subscription_line_id, invoice_id, amount,
       reason, status, issued_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6
     ) RETURNING *`,
    [
      data.subscriptionLineId,
      data.invoiceId || null,
      String(data.amount),
      data.reason,
      data.status || 'ISSUED',
      data.issuedAt || new Date(),
    ],
    tx
  );
}

export async function findUnappliedCreditNotes({ limit = 50 } = {}) {
  const sql = `
    SELECT
      cn.id,
      cn.subscription_line_id,
      cn.invoice_id,
      cn.amount,
      cn.reason,
      cn.status,
      cn.issued_at,
      cn.created_at,
      p.name AS product_name,
      c.name AS customer_name
    FROM credit_notes cn
    INNER JOIN subscription_lines sl ON sl.id = cn.subscription_line_id
    INNER JOIN order_items oi ON oi.id = sl.order_item_id
    INNER JOIN products p ON p.id = oi.product_id
    INNER JOIN orders o ON o.id = oi.order_id
    INNER JOIN customers c ON c.id = o.customer_id
    WHERE cn.status = 'ISSUED'
    ORDER BY cn.issued_at DESC
    LIMIT $1
  `;

  const rows = await query(sql, [limit]);
  return rows.map((r) => ({
    creditNote: {
      id: r.id,
      creditNoteNumber: `CN-${r.id.slice(0, 8).toUpperCase()}`,
      subscriptionLineId: r.subscriptionLineId,
      invoiceId: r.invoiceId,
      amount: r.amount,
      reason: r.reason,
      status: r.status,
      issuedAt: r.issuedAt,
      appliedAt: null,
    },
    productName: r.productName,
    customerName: r.customerName,
  }));
}

// ---------- Reconciliation aggregates ----------

export async function findOverdueInvoices({ asOfDate, limit = 50 } = {}) {
  const sql = `
    SELECT
      i.id,
      i.invoice_number,
      i.order_id,
      i.customer_id,
      i.invoice_type,
      i.status,
      i.subtotal,
      i.tax_total,
      i.total,
      i.amount_paid,
      i.due_date,
      i.issued_at,
      i.created_at,
      c.name AS customer_name,
      o.order_number
    FROM invoices i
    INNER JOIN orders o ON o.id = i.order_id
    INNER JOIN customers c ON c.id = i.customer_id
    WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID') AND i.due_date <= $1
    ORDER BY i.due_date ASC
    LIMIT $2
  `;

  const rows = await query(sql, [asOfDate, limit]);
  return rows.map((r) => ({
    invoice: {
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      orderId: r.orderId,
      customerId: r.customerId,
      invoiceType: r.invoiceType,
      status: r.status,
      subtotal: r.subtotal,
      taxTotal: r.taxTotal,
      total: r.total,
      amountPaid: r.amountPaid,
      dueDate: r.dueDate,
      issuedAt: r.issuedAt,
      paidAt: null,
      createdAt: r.createdAt,
      updatedAt: null,
    },
    customerName: r.customerName,
    orderNumber: r.orderNumber,
  }));
}

export async function insertAuditLog(entry, tx = undefined) {
  return await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.actorId || null,
      entry.entityType || 'INVOICE',
      entry.entityId,
      entry.action,
      entry.reason || null,
      entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
    ],
    tx
  );
}

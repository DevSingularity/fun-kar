import { query, queryOne } from '../../config/database.js';

export async function findInvoiceById(invoiceId) {
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
      q.sales_rep_id
    FROM invoices i
    INNER JOIN orders o ON o.id = i.order_id
    INNER JOIN quotations q ON q.id = o.quotation_id
    WHERE i.id = $1
    LIMIT 1
  `;

  const row = await queryOne(sql, [invoiceId]);
  if (!row) return null;

  return {
    invoice: {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      orderId: row.orderId,
      customerId: row.customerId,
      invoiceType: row.invoiceType,
      status: row.status,
      subtotal: row.subtotal,
      taxTotal: row.taxTotal,
      total: row.total,
      amountPaid: row.amountPaid,
      dueDate: row.dueDate,
      issuedAt: row.issuedAt,
      paidAt: null,
      createdAt: row.createdAt,
      updatedAt: null,
    },
    salesRepId: row.salesRepId,
  };
}

export async function insertPayment(data) {
  return await queryOne(
    `INSERT INTO payments (
       invoice_id, amount, method, transaction_reference, status, paid_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6
     ) RETURNING *`,
    [
      data.invoiceId,
      String(data.amount),
      data.method || 'BANK_TRANSFER',
      data.transactionReference || data.reference || null,
      data.status || 'SUCCEEDED',
      data.paidAt || new Date(),
    ]
  );
}

export async function updateInvoice(id, data) {
  const setParts = [];
  const params = [id];
  let idx = 2;

  if (data.amountPaid !== undefined) {
    setParts.push(`amount_paid = $${idx++}`);
    params.push(String(data.amountPaid));
  }
  if (data.status !== undefined) {
    setParts.push(`status = $${idx++}`);
    params.push(data.status);
  }

  if (setParts.length === 0) {
    return await queryOne(`SELECT * FROM invoices WHERE id = $1`, [id]);
  }

  return await queryOne(
    `UPDATE invoices
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function insertAuditLog(data) {
  const actorId = (data.actorId && UUID_REGEX.test(String(data.actorId))) ? data.actorId : null;
  return await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, old_value, new_value)
     VALUES ($1, 'INVOICE', $2, $3, $4, $5, $6)`,
    [
      actorId,
      data.entityId,
      data.action,
      data.reason || null,
      data.oldValue ? JSON.stringify(data.oldValue) : null,
      data.newValue ? JSON.stringify(data.newValue) : null,
    ]
  );
}

export async function listPayments(invoiceId, { offset, limit }) {
  const countRow = await queryOne(
    `SELECT count(*)::int AS count FROM payments WHERE invoice_id = $1`,
    [invoiceId]
  );
  const count = countRow?.count || 0;

  const rows = await query(
    `SELECT * FROM payments
     WHERE invoice_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [invoiceId, limit, offset]
  );

  return { rows, count };
}

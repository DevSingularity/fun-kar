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
      i.paid_at,
      i.created_at,
      i.updated_at,
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
      paidAt: row.paidAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    salesRepId: row.salesRepId,
  };
}

export async function insertPayment(data) {
  return await queryOne(
    `INSERT INTO payments (
       invoice_id, amount, payment_method, reference, payment_date
     ) VALUES (
       $1, $2, $3, $4, $5
     ) RETURNING *`,
    [
      data.invoiceId,
      String(data.amount),
      data.paymentMethod,
      data.reference || null,
      data.paymentDate || new Date(),
    ]
  );
}

export async function updateInvoice(id, data) {
  const setParts = ['updated_at = NOW()'];
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
  if (data.paidAt !== undefined) {
    setParts.push(`paid_at = $${idx++}`);
    params.push(data.paidAt);
  }

  return await queryOne(
    `UPDATE invoices
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
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

import { query, queryOne } from '../../config/database.js';

export async function hasBeenShared(quotationId) {
  const row = await queryOne(
    `SELECT id FROM quotation_portal_tokens WHERE quotation_id = $1 LIMIT 1`,
    [quotationId]
  );
  return !!row;
}

export async function findCustomerWithRep(customerId) {
  return await queryOne(
    `SELECT id, assigned_rep_id, tier FROM customers WHERE id = $1`,
    [customerId]
  );
}

export async function listForCustomer(customerId, { offset, limit }) {
  const countRow = await queryOne(
    `SELECT count(*)::int AS count
     FROM quotations q
     WHERE q.customer_id = $1
       AND (
         EXISTS (SELECT 1 FROM quotation_portal_tokens qpt WHERE qpt.quotation_id = q.id)
         OR q.origin_type = 'CUSTOMER_SELF_SERVICE'
       )`,
    [customerId]
  );
  const count = countRow?.count || 0;

  const rows = await query(
    `SELECT
       q.id,
       q.quote_number,
       q.customer_id,
       q.status,
       q.origin_type,
       q.subtotal,
       q.discount_total,
       q.tax_total,
       q.grand_total,
       q.promised_delivery_date,
       q.created_at,
       q.confirmed_at
     FROM quotations q
     WHERE q.customer_id = $1
       AND (
         EXISTS (SELECT 1 FROM quotation_portal_tokens qpt WHERE qpt.quotation_id = q.id)
         OR q.origin_type = 'CUSTOMER_SELF_SERVICE'
       )
     ORDER BY q.created_at DESC
     LIMIT $2 OFFSET $3`,
    [customerId, limit, offset]
  );

  return { rows, count };
}

export async function findSafeQuote(quotationId) {
  const quote = await queryOne(
    `SELECT
       q.id,
       q.quote_number,
       q.customer_id,
       q.status,
       q.origin_type,
       q.subtotal,
       q.discount_total,
       q.tax_total,
       q.grand_total,
       q.promised_delivery_date,
       q.created_at,
       q.confirmed_at,
       c.name AS customer_name
     FROM quotations q
     INNER JOIN customers c ON q.customer_id = c.id
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
       qi.quantity,
       qi.unit_price,
       qi.discount_pct,
       qi.discount_amount,
       qi.tax_amount,
       qi.line_total
     FROM quotation_items qi
     INNER JOIN products p ON qi.product_id = p.id
     WHERE qi.quotation_id = $1
     ORDER BY qi.created_at ASC`,
    [quotationId]
  );

  return {
    ...quote,
    items,
  };
}

export async function findRawQuote(quotationId) {
  return await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [quotationId]
  );
}

export async function findOrderForQuotation(quotationId) {
  return await queryOne(
    `SELECT * FROM orders WHERE quotation_id = $1`,
    [quotationId]
  );
}

export async function findDraftOneTimeInvoice(orderId) {
  return await queryOne(
    `SELECT * FROM invoices WHERE order_id = $1 AND status = 'DRAFT'`,
    [orderId]
  );
}

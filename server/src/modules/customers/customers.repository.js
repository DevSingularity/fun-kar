import { query, queryOne } from '../../config/database.js';

export async function findCustomers({
  search,
  tier,
  assignedRepId,
  limit = 20,
  offset = 0,
} = {}, tx = null) {
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.name ILIKE $${params.length} OR c.email ILIKE $${params.length})`);
  }
  if (tier) {
    params.push(tier);
    conditions.push(`c.tier = $${params.length}`);
  }
  if (Array.isArray(assignedRepId)) {
    if (assignedRepId.length > 0) {
      params.push(assignedRepId);
      conditions.push(`c.assigned_rep_id = ANY($${params.length}::uuid[])`);
    }
  } else if (assignedRepId) {
    params.push(assignedRepId);
    conditions.push(`c.assigned_rep_id = $${params.length}`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM customers c ${whereSql}`,
    params,
    tx
  );

  params.push(limit);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const items = await query(
    `SELECT 
       c.id,
       c.name,
       c.email,
       c.phone,
       c.tier,
       c.assigned_rep_id AS "assignedRepId",
       u.name AS "assignedRepName",
       c.price_list_id AS "priceListId",
       pl.name AS "priceListName",
       c.billing_address AS "billingAddress",
       c.created_at AS "createdAt",
       c.updated_at AS "updatedAt"
     FROM customers c
     LEFT JOIN users u ON c.assigned_rep_id = u.id
     LEFT JOIN price_lists pl ON c.price_list_id = pl.id
     ${whereSql}
     ORDER BY c.name ASC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    params,
    tx
  );

  return { items, total: countRow?.total || 0 };
}

export async function findCustomerById(id, tx = null) {
  return queryOne(
    `SELECT 
       c.id,
       c.name,
       c.email,
       c.phone,
       c.tier,
       c.assigned_rep_id AS "assignedRepId",
       u.name AS "assignedRepName",
       c.price_list_id AS "priceListId",
       pl.name AS "priceListName",
       c.billing_address AS "billingAddress",
       c.created_at AS "createdAt",
       c.updated_at AS "updatedAt"
     FROM customers c
     LEFT JOIN users u ON c.assigned_rep_id = u.id
     LEFT JOIN price_lists pl ON c.price_list_id = pl.id
     WHERE c.id = $1
     LIMIT 1`,
    [id],
    tx
  );
}

export async function findCustomerByEmail(email, tx = null) {
  return queryOne(
    `SELECT * FROM customers WHERE LOWER(email) = $1 LIMIT 1`,
    [email.toLowerCase().trim()],
    tx
  );
}

export async function createCustomer(data, tx = null) {
  return queryOne(
    `INSERT INTO customers (
       name, email, phone, tier, assigned_rep_id, price_list_id, billing_address, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING *`,
    [
      data.name.trim(),
      data.email.toLowerCase().trim(),
      data.phone?.trim() || null,
      data.tier || 'BRONZE',
      data.assignedRepId || null,
      data.priceListId || null,
      data.billingAddress?.trim() || null,
    ],
    tx
  );
}

export async function updateCustomer(id, data, tx = null) {
  const fields = [];
  const params = [];

  if (data.name !== undefined) {
    params.push(data.name.trim());
    fields.push(`name = $${params.length}`);
  }
  if (data.email !== undefined) {
    params.push(data.email.toLowerCase().trim());
    fields.push(`email = $${params.length}`);
  }
  if (data.phone !== undefined) {
    params.push(data.phone?.trim() || null);
    fields.push(`phone = $${params.length}`);
  }
  if (data.tier !== undefined) {
    params.push(data.tier);
    fields.push(`tier = $${params.length}`);
  }
  if (data.assignedRepId !== undefined) {
    params.push(data.assignedRepId || null);
    fields.push(`assigned_rep_id = $${params.length}`);
  }
  if (data.priceListId !== undefined) {
    params.push(data.priceListId || null);
    fields.push(`price_list_id = $${params.length}`);
  }
  if (data.billingAddress !== undefined) {
    params.push(data.billingAddress?.trim() || null);
    fields.push(`billing_address = $${params.length}`);
  }

  fields.push(`updated_at = NOW()`);

  params.push(id);
  const idIdx = params.length;

  return queryOne(
    `UPDATE customers
     SET ${fields.join(', ')}
     WHERE id = $${idIdx}
     RETURNING *`,
    params,
    tx
  );
}

export async function deleteCustomer(id, tx = null) {
  return queryOne(
    `DELETE FROM customers
     WHERE id = $1
     RETURNING *`,
    [id],
    tx
  );
}

import { query, queryOne } from '../../config/database.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';
import { parseListQuery, buildMeta } from '../../common/pagination.util.js';

export async function checkCustomerAccess(customerId, authUser) {
  const customer = await queryOne(
    `SELECT * FROM customers WHERE id = $1`,
    [customerId]
  );

  if (!customer) {
    throw new NotFoundError(`Customer with ID '${customerId}' not found.`, 'CUSTOMER_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && customer.assignedRepId !== authUser.id) {
    throw new ForbiddenError('You do not have permission to manage portal contacts for this customer.', 'CUSTOMER_ACCESS_DENIED');
  }
  return customer;
}

export async function listPortalUsers(customerId, queryParams, authUser) {
  await checkCustomerAccess(customerId, authUser);

  const { page, limit, offset } = parseListQuery(queryParams);

  const rows = await query(
    `SELECT id, customer_id, name, email, is_active, created_at
     FROM customer_users
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [customerId, limit, offset]
  );

  const countRow = await queryOne(
    `SELECT count(*)::int AS count
     FROM customer_users
     WHERE customer_id = $1`,
    [customerId]
  );
  const count = countRow?.count || 0;

  return {
    items: rows,
    meta: buildMeta(count, page, limit),
  };
}

export async function createPortalUser(customerId, { name, email }, authUser) {
  await checkCustomerAccess(customerId, authUser);

  try {
    const inserted = await queryOne(
      `INSERT INTO customer_users (customer_id, name, email, password_hash)
       VALUES ($1, $2, $3, NULL)
       RETURNING id, customer_id, name, email, is_active, created_at`,
      [customerId, name, email]
    );

    return {
      id: inserted.id,
      customerId: inserted.customerId,
      name: inserted.name,
      email: inserted.email,
      isActive: inserted.isActive,
      createdAt: inserted.createdAt,
    };
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('A portal contact with this email address already exists.', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

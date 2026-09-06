import { query, queryOne } from '../../config/database.js';

export async function findActiveByEmail(email) {
  let user = await queryOne(
    `SELECT * FROM customer_users
     WHERE LOWER(email) = LOWER($1) AND is_active = true`,
    [email]
  );
  if (user) return user;

  // Fallback: check if the email matches a company in `customers` table
  const cust = await queryOne(
    `SELECT * FROM customers WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  if (cust) {
    user = await queryOne(
      `SELECT * FROM customer_users WHERE customer_id = $1 AND is_active = true LIMIT 1`,
      [cust.id]
    );
    if (user) return user;

    user = await queryOne(
      `INSERT INTO customer_users (customer_id, name, email, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       RETURNING *`,
      [cust.id, cust.name + ' Contact', email]
    );
    return user;
  }

  return null;
}

export async function findById(id) {
  return await queryOne(
    `SELECT
       cu.id,
       cu.name,
       cu.email,
       cu.customer_id,
       cu.is_active,
       c.name AS customer_name,
       c.tier AS customer_tier
     FROM customer_users cu
     INNER JOIN customers c ON cu.customer_id = c.id
     WHERE cu.id = $1`,
    [id]
  );
}

export async function findCustomerUserRecord(id) {
  return await queryOne(
    `SELECT * FROM customer_users WHERE id = $1`,
    [id]
  );
}

export async function insertToken(data) {
  return await queryOne(
    `INSERT INTO portal_tokens (customer_user_id, token_hash, expires_at, used_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.customerUserId, data.tokenHash, data.expiresAt, data.usedAt || null]
  );
}

export async function findValidToken(tokenHash) {
  return await queryOne(
    `SELECT * FROM portal_tokens
     WHERE token_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()`,
    [tokenHash]
  );
}

export async function markTokenUsed(id) {
  await query(
    `UPDATE portal_tokens
     SET used_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

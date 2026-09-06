import { query, queryOne } from '../../config/database.js';

export async function findActiveByEmail(email) {
  return await queryOne(
    `SELECT * FROM customer_users
     WHERE LOWER(email) = LOWER($1) AND is_active = true`,
    [email]
  );
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

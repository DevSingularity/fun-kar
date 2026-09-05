import { queryOne } from '../../config/database.js';

export async function findUserByEmail(email, tx = null) {
  const normalizedEmail = email.toLowerCase().trim();
  return queryOne(
    `SELECT id, name, email, password_hash AS "passwordHash", role, is_active AS "isActive", manager_id AS "managerId", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalizedEmail],
    tx
  );
}

export async function findUserById(id, tx = null) {
  return queryOne(
    `SELECT id, name, email, role, is_active AS "isActive", manager_id AS "managerId", created_at AS "createdAt", updated_at AS "updatedAt"
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
    tx
  );
}

export async function createUser(userData, tx = null) {
  return queryOne(
    `INSERT INTO users (name, email, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, NOW(), NOW())
     RETURNING id, name, email, role, is_active AS "isActive", created_at AS "createdAt"`,
    [
      userData.name.trim(),
      userData.email.toLowerCase().trim(),
      userData.passwordHash,
      userData.role || 'SALES_REP',
    ],
    tx
  );
}

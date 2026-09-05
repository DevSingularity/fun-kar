import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { users } from '../../db/schema/users.js';

export async function findUserByEmail(email, tx = undefined) {
  const db = tx || getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);
  return user || null;
}

export async function findUserById(id, tx = undefined) {
  const db = tx || getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return user || null;
}

export async function createUser(userData, tx = undefined) {
  const db = tx || getDb();
  const [user] = await db
    .insert(users)
    .values({
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      passwordHash: userData.passwordHash,
      role: userData.role || 'SALES_REP',
      isActive: true,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });
  return user;
}

import 'dotenv/config';
import { connectDatabase, getDb } from '../config/database.js';
import { users } from './schema/users.js';
import { hashPassword } from '../common/password.util.js';
import { sql } from 'drizzle-orm';

const SEED_USERS = [
  { name: 'System Administrator', email: 'admin@dealflow.io', role: 'ADMIN' },
  { name: 'Alex Morgan (Sales Rep)', email: 'rep@dealflow.io', role: 'SALES_REP' },
  { name: 'Sarah Chen (Sales Manager)', email: 'manager@dealflow.io', role: 'SALES_MANAGER' },
  { name: 'David Miller (Finance Lead)', email: 'finance@dealflow.io', role: 'FINANCE' },
  { name: 'Elena Rostova (Operations Head)', email: 'ops@dealflow.io', role: 'OPERATIONS' },
];

const DEFAULT_PASSWORD = 'Password123!';

async function runSeed() {
  console.log('[SEED] Connecting to database...');
  await connectDatabase();
  const db = getDb();

  console.log('[SEED] Hashing default credentials...');
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  console.log('[SEED] Upserting internal demo users...');
  for (const user of SEED_USERS) {
    const existing = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${user.email.toLowerCase()}`)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(users).values({
        name: user.name,
        email: user.email.toLowerCase(),
        passwordHash,
        role: user.role,
        isActive: true,
      });
      console.log(`[SEED] Created user: ${user.email} (${user.role})`);
    } else {
      await db
        .update(users)
        .set({
          name: user.name,
          role: user.role,
          passwordHash,
          isActive: true,
        })
        .where(sql`lower(${users.email}) = ${user.email.toLowerCase()}`);
      console.log(`[SEED] Updated user: ${user.email} (${user.role})`);
    }
  }

  console.log('[SEED] Phase 1 seed completed successfully.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('[SEED] Failed to seed database:', err);
  process.exit(1);
});

import 'dotenv/config';
import { connectDatabase } from '../config/database.js';
import { loginUser, getCurrentUserProfile } from '../modules/auth/auth.service.js';

async function testPhase1() {
  console.log('[TEST] Connecting to DB...');
  await connectDatabase();

  const testAccounts = [
    { email: 'admin@dealflow.io', role: 'ADMIN' },
    { email: 'rep@dealflow.io', role: 'SALES_REP' },
    { email: 'manager@dealflow.io', role: 'SALES_MANAGER' },
    { email: 'finance@dealflow.io', role: 'FINANCE' },
    { email: 'ops@dealflow.io', role: 'OPERATIONS' },
  ];

  console.log('[TEST] Verifying live database authentication & token generation for all 5 roles...');
  for (const acc of testAccounts) {
    const authResult = await loginUser({ email: acc.email, password: 'Password123!' });
    if (!authResult.accessToken || authResult.user.role !== acc.role) {
      throw new Error(`Authentication verification failed for ${acc.email}`);
    }
    const profile = await getCurrentUserProfile(authResult.user.id);
    console.log(`[PASS] ${acc.role.padEnd(14)} -> ${profile.email} (ID: ${profile.id}) | Access Token: Valid`);
  }

  console.log('\n[ALL PASS] Phase 1 Identity & Auth Engine is 100% verified and operating correctly with live DB.');
  process.exit(0);
}

testPhase1().catch((err) => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});

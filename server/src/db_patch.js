import { query } from './config/database.js';

async function patch() {
  try {
    await query(`ALTER TYPE approval_level ADD VALUE IF NOT EXISTS 'FINANCE'`);
    console.log('Enum approval_level updated with FINANCE');
  } catch (err) {
    console.error('Error adding FINANCE to enum:', err);
  }
}

patch().then(() => process.exit(0));

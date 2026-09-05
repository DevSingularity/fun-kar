import 'dotenv/config';

function requireEnv(key, defaultValue = undefined) {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`[CONFIG] Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  
  PORT: parseInt(process.env.PORT || '5000', 10),
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  
  DATABASE_URL: requireEnv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5433/odoo'),
  
  JWT_SECRET: requireEnv('JWT_SECRET', 'dealflow360-default-jwt-secret-key-replace-in-prod'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ENABLE_DEMO_ACCOUNTS: process.env.ENABLE_DEMO_ACCOUNTS !== 'false',
  
  DEMO_ACCOUNTS: [
    { role: 'ADMIN', name: 'System Admin', email: 'admin@dealflow.io', roleDescription: 'Full system configuration, users & master data' },
    { role: 'SALES_REP', name: 'Alex Morgan (Rep)', email: 'rep@dealflow.io', roleDescription: 'Quotation creation, discount requests, deal rooms' },
    { role: 'SALES_MANAGER', name: 'Sarah Chen (Manager)', email: 'manager@dealflow.io', roleDescription: 'Discount review, approval queue, team pipeline' },
    { role: 'FINANCE', name: 'David Miller (Finance)', email: 'finance@dealflow.io', roleDescription: 'High-risk margin review, payment terms & invoices' },
    { role: 'OPERATIONS', name: 'Elena Rostova (Ops)', email: 'ops@dealflow.io', roleDescription: 'Multi-warehouse stock allocation & backorders' },
  ],
};

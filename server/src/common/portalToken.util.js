import crypto from 'node:crypto';

export function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(raw) {
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Auth validators — pure functions, no external deps.
 * Returns { valid: boolean, errors: string[] }
 */

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateRegisterPayload(payload = {}) {
  const errors = [];
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = normalize(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';
  const confirmPassword = typeof payload.confirmPassword === 'string' ? payload.confirmPassword : '';

  // TODO: rename "name" validation label to match your entity (e.g. "Organization name")
  if (!name) errors.push('Name is required.');
  if (!email || !email.includes('@')) errors.push('A valid email address is required.');
  if (password.length < 8) errors.push('Password must be at least 8 characters.');
  if (confirmPassword && confirmPassword !== password) errors.push('Passwords do not match.');

  return { valid: errors.length === 0, errors };
}

export function validateLoginPayload(payload = {}) {
  const errors = [];
  const email = normalize(payload.email);
  if (!email || !email.includes('@')) errors.push('A valid email address is required.');
  if (!payload.password) errors.push('Password is required.');
  return { valid: errors.length === 0, errors };
}

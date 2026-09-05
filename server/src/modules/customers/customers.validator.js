import { ValidationError } from '../../common/errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_TIERS = ['BRONZE', 'SILVER', 'GOLD'];

export function validateCreateCustomer(req, res, next) {
  const { name, email, tier } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Customer name is required.' });
  }
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Valid customer email is required.' });
  }
  if (tier !== undefined && !VALID_TIERS.includes(tier)) {
    errors.push({ field: 'tier', message: `Customer tier must be one of: ${VALID_TIERS.join(', ')}` });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for customer creation.', errors));
  }
  next();
}

export function validateUpdateCustomer(req, res, next) {
  const { email, tier } = req.body || {};
  const errors = [];

  if (email !== undefined && (!email || !EMAIL_REGEX.test(email.trim()))) {
    errors.push({ field: 'email', message: 'Valid customer email is required.' });
  }
  if (tier !== undefined && !VALID_TIERS.includes(tier)) {
    errors.push({ field: 'tier', message: `Customer tier must be one of: ${VALID_TIERS.join(', ')}` });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for customer update.', errors));
  }
  next();
}

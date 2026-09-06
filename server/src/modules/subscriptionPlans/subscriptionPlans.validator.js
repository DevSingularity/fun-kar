import { ValidationError } from '../../common/errors.js';

const VALID_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

export function validateCreatePlan(req, res, next) {
  const { name, frequency, price } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Plan name is required.' });
  }
  if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
    errors.push({ field: 'frequency', message: `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}` });
  }
  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    errors.push({ field: 'price', message: 'A valid non-negative price is required.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for subscription plan creation.', errors));
  }
  next();
}

export function validateUpdatePlan(req, res, next) {
  const { name, frequency, price } = req.body || {};
  const errors = [];

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    errors.push({ field: 'name', message: 'Plan name cannot be empty.' });
  }
  if (frequency !== undefined && !VALID_FREQUENCIES.includes(frequency)) {
    errors.push({ field: 'frequency', message: `Frequency must be one of: ${VALID_FREQUENCIES.join(', ')}` });
  }
  if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
    errors.push({ field: 'price', message: 'Price must be a non-negative number.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for subscription plan update.', errors));
  }
  next();
}

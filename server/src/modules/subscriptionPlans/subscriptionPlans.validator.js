import { ValidationError } from '../../common/errors.js';

const VALID_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

export function validateCreatePlan(req, res, next) {
  const { name, frequency, price, cancellationNoticeDays, prorationEnabled, isActive } = req.body || {};
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
  if (cancellationNoticeDays !== undefined && (isNaN(Number(cancellationNoticeDays)) || Number(cancellationNoticeDays) < 0 || !Number.isInteger(Number(cancellationNoticeDays)))) {
    errors.push({ field: 'cancellationNoticeDays', message: 'cancellationNoticeDays must be a non-negative whole number.' });
  }
  if (prorationEnabled !== undefined && typeof prorationEnabled !== 'boolean') {
    errors.push({ field: 'prorationEnabled', message: 'prorationEnabled must be true or false.' });
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be true or false.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for subscription plan creation.', errors));
  }
  next();
}

export function validateUpdatePlan(req, res, next) {
  const { name, frequency, price, cancellationNoticeDays, prorationEnabled, isActive } = req.body || {};
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
  if (cancellationNoticeDays !== undefined && (isNaN(Number(cancellationNoticeDays)) || Number(cancellationNoticeDays) < 0 || !Number.isInteger(Number(cancellationNoticeDays)))) {
    errors.push({ field: 'cancellationNoticeDays', message: 'cancellationNoticeDays must be a non-negative whole number.' });
  }
  if (prorationEnabled !== undefined && typeof prorationEnabled !== 'boolean') {
    errors.push({ field: 'prorationEnabled', message: 'prorationEnabled must be true or false.' });
  }
  if (isActive !== undefined && typeof isActive !== 'boolean') {
    errors.push({ field: 'isActive', message: 'isActive must be true or false.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for subscription plan update.', errors));
  }
  next();
}

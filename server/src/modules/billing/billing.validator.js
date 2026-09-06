import { ValidationError } from '../../common/errors.js';

export function validateChangeSubscription(req, res, next) {
  const { quantity, newPlanId } = req.body || {};
  const errors = [];
  if (quantity === undefined && !newPlanId) {
    errors.push({ field: 'quantity', message: 'Provide quantity and/or newPlanId.' });
  }
  if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) <= 0)) {
    errors.push({ field: 'quantity', message: 'quantity must be a positive number.' });
  }
  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for subscription change.', errors));
  }
  next();
}

export function validateCancelSubscription(req, res, next) {
  const { reason } = req.body || {};
  if (reason !== undefined && typeof reason !== 'string') {
    return next(new ValidationError('reason must be a string.', [{ field: 'reason', message: 'reason must be a string.' }]));
  }
  next();
}

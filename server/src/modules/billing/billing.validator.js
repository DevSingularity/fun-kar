import { ValidationError } from '../../common/errors.js';

export function validateChangeSubscription(req, res, next) {
  const { quantity, newPlanId, newProductId } = req.body || {};
  const errors = [];
  if (quantity === undefined && !newPlanId && !newProductId) {
    errors.push({ field: 'quantity', message: 'Provide quantity, newPlanId, and/or newProductId.' });
  }
  if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) <= 0)) {
    errors.push({ field: 'quantity', message: 'quantity must be a positive number.' });
  }
  if (newProductId !== undefined && (typeof newProductId !== 'string' || newProductId.trim().length === 0)) {
    errors.push({ field: 'newProductId', message: 'newProductId must be a non-empty string.' });
  }
  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for subscription change.', errors));
  }
  next();
}

export function validateCancelSubscription(req, res, next) {
  const { reason, overrideNotice } = req.body || {};
  const errors = [];
  if (reason !== undefined && typeof reason !== 'string') {
    errors.push({ field: 'reason', message: 'reason must be a string.' });
  }
  if (overrideNotice !== undefined && typeof overrideNotice !== 'boolean') {
    errors.push({ field: 'overrideNotice', message: 'overrideNotice must be a boolean.' });
  }
  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for subscription cancellation.', errors));
  }
  next();
}

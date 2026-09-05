import { ValidationError } from '../../common/errors.js';

export function validateCreatePayment(req, res, next) {
  const { amount, method, transactionReference } = req.body || {};
  const errors = [];

  const numAmount = Number(amount);
  if (amount === undefined || amount === null || isNaN(numAmount) || numAmount <= 0) {
    errors.push({ field: 'amount', message: 'amount must be a positive number.' });
  }

  if (!method || typeof method !== 'string' || method.trim().length === 0) {
    errors.push({ field: 'method', message: 'method is required.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for payment input.', errors));
  }

  req.body.amount = numAmount.toFixed(2);
  req.body.method = method.trim();
  req.body.transactionReference = transactionReference ? String(transactionReference).trim() : null;
  next();
}

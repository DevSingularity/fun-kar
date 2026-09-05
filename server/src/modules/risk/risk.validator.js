import { ValidationError } from '../../common/errors.js';

export function validateRiskEvaluation(req, res, next) {
  const { customerId, lines } = req.body || {};
  const errors = [];

  if (!customerId || typeof customerId !== 'string') {
    errors.push({ field: 'customerId', message: 'customerId is required.' });
  }

  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    errors.push({ field: 'lines', message: 'lines must be a non-empty array of quotation line items.' });
  } else {
    lines.forEach((line, idx) => {
      if (!line.productId || typeof line.productId !== 'string') {
        errors.push({ field: `lines[${idx}].productId`, message: 'productId is required.' });
      }
      if (line.requestedDiscountPct !== undefined && (typeof line.requestedDiscountPct !== 'number' || line.requestedDiscountPct < 0 || line.requestedDiscountPct > 100)) {
        errors.push({ field: `lines[${idx}].requestedDiscountPct`, message: 'requestedDiscountPct must be between 0 and 100.' });
      }
      if (line.quantity !== undefined && (typeof line.quantity !== 'number' || line.quantity <= 0)) {
        errors.push({ field: `lines[${idx}].quantity`, message: 'quantity must be a positive number.' });
      }
    });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for risk evaluation request.', errors));
  }
  next();
}

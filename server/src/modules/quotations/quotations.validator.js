import { ValidationError } from '../../common/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str.trim());
}

export function validateCreateQuotation(req, res, next) {
  const { customerId, promisedDeliveryDate, salesRepId } = req.body || {};
  const errors = [];

  if (!isValidUUID(customerId)) {
    errors.push({ field: 'customerId', message: 'Valid customerId UUID is required.' });
  }

  if (promisedDeliveryDate !== undefined && promisedDeliveryDate !== null) {
    const d = new Date(promisedDeliveryDate);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'promisedDeliveryDate', message: 'promisedDeliveryDate must be a valid ISO date.' });
    }
  }

  if (salesRepId !== undefined && salesRepId !== null && !isValidUUID(salesRepId)) {
    errors.push({ field: 'salesRepId', message: 'salesRepId must be a valid UUID.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for quotation creation.', errors));
  }
  next();
}

export function validateUpdateQuotation(req, res, next) {
  const { promisedDeliveryDate, salesRepId } = req.body || {};
  const errors = [];

  if (promisedDeliveryDate !== undefined && promisedDeliveryDate !== null) {
    const d = new Date(promisedDeliveryDate);
    if (isNaN(d.getTime())) {
      errors.push({ field: 'promisedDeliveryDate', message: 'promisedDeliveryDate must be a valid ISO date.' });
    }
  }

  if (salesRepId !== undefined && salesRepId !== null && !isValidUUID(salesRepId)) {
    errors.push({ field: 'salesRepId', message: 'salesRepId must be a valid UUID.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for quotation update.', errors));
  }
  next();
}

export function validateAddItem(req, res, next) {
  const { productId, quantity, discountPct } = req.body || {};
  const errors = [];

  if (!isValidUUID(productId)) {
    errors.push({ field: 'productId', message: 'Valid productId UUID is required.' });
  }

  const qty = Number(quantity);
  if (quantity === undefined || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    errors.push({ field: 'quantity', message: 'quantity must be a positive integer.' });
  }

  if (discountPct !== undefined) {
    const d = Number(discountPct);
    if (isNaN(d) || d < 0 || d > 100) {
      errors.push({ field: 'discountPct', message: 'discountPct must be between 0 and 100.' });
    }
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for line item addition.', errors));
  }
  next();
}

export function validateUpdateItem(req, res, next) {
  const { quantity, discountPct } = req.body || {};
  const errors = [];

  if (quantity === undefined && discountPct === undefined) {
    errors.push({ field: 'body', message: 'At least one of quantity or discountPct must be provided.' });
  }

  if (quantity !== undefined) {
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      errors.push({ field: 'quantity', message: 'quantity must be a positive integer.' });
    }
  }

  if (discountPct !== undefined) {
    const d = Number(discountPct);
    if (isNaN(d) || d < 0 || d > 100) {
      errors.push({ field: 'discountPct', message: 'discountPct must be between 0 and 100.' });
    }
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for line item update.', errors));
  }
  next();
}

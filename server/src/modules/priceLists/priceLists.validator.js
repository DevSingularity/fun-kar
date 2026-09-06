import { ValidationError } from '../../common/errors.js';

const VALID_TIERS = ['DEFAULT', 'BRONZE', 'SILVER', 'GOLD'];

export function validateCreatePriceList(req, res, next) {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return next(new ValidationError('Price list name is required.'));
  }
  next();
}

export function validateUpsertItem(req, res, next) {
  const { productId, customerTier, unitPrice } = req.body || {};
  const errors = [];

  if (!productId) errors.push({ field: 'productId', message: 'Product ID is required.' });
  if (!customerTier || !VALID_TIERS.includes(customerTier)) {
    errors.push({ field: 'customerTier', message: `Customer tier must be one of: ${VALID_TIERS.join(', ')}` });
  }
  if (unitPrice === undefined || isNaN(Number(unitPrice)) || Number(unitPrice) < 0) {
    errors.push({ field: 'unitPrice', message: 'Unit price must be a non-negative number.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for price list item.', errors));
  }
  next();
}

import { ValidationError } from '../../common/errors.js';

const VALID_PRODUCT_TYPES = ['ONE_TIME', 'SERVICE', 'SUBSCRIPTION'];

export function validateCreateProduct(req, res, next) {
  const { categoryId, sku, name, basePrice, productType, subscriptionPlanId } = req.body || {};
  const errors = [];

  if (!categoryId) errors.push({ field: 'categoryId', message: 'Category ID is required.' });
  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    errors.push({ field: 'sku', message: 'SKU is required (1-50 characters).' });
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Product name is required (1-200 characters).' });
  }
  if (basePrice === undefined || isNaN(Number(basePrice)) || Number(basePrice) < 0) {
    errors.push({ field: 'basePrice', message: 'A valid non-negative base price is required.' });
  }
  if (!productType || !VALID_PRODUCT_TYPES.includes(productType)) {
    errors.push({
      field: 'productType',
      message: `Product type must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`,
    });
  }
  if (productType === 'SUBSCRIPTION' && !subscriptionPlanId) {
    errors.push({
      field: 'subscriptionPlanId',
      message: 'A subscription plan is required for SUBSCRIPTION-type products.',
    });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for product creation.', errors));
  }
  next();
}

export function validateUpdateProduct(req, res, next) {
  const { basePrice, estimatedCost, taxRate, productType, subscriptionPlanId } = req.body || {};
  const errors = [];

  if (basePrice !== undefined && (isNaN(Number(basePrice)) || Number(basePrice) < 0)) {
    errors.push({ field: 'basePrice', message: 'Base price must be a non-negative number.' });
  }
  if (estimatedCost !== undefined && (isNaN(Number(estimatedCost)) || Number(estimatedCost) < 0)) {
    errors.push({ field: 'estimatedCost', message: 'Estimated cost must be a non-negative number.' });
  }
  if (taxRate !== undefined && (isNaN(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 100)) {
    errors.push({ field: 'taxRate', message: 'Tax rate must be between 0 and 100.' });
  }
  if (productType !== undefined && !VALID_PRODUCT_TYPES.includes(productType)) {
    errors.push({
      field: 'productType',
      message: `Product type must be one of: ${VALID_PRODUCT_TYPES.join(', ')}`,
    });
  }
  if (productType === 'SUBSCRIPTION' && subscriptionPlanId === undefined) {
    errors.push({
      field: 'subscriptionPlanId',
      message: 'A subscription plan is required when setting productType to SUBSCRIPTION.',
    });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for product update.', errors));
  }
  next();
}

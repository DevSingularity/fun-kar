import { ValidationError } from '../../common/errors.js';

export function validateCreateWarehouse(body = {}) {
  const errors = [];
  const name = String(body.name || '').trim();
  if (!name || name.length > 100) {
    errors.push('Warehouse name is required and must be at most 100 characters.');
  }

  const weight = body.shippingCostWeight !== undefined ? Number(body.shippingCostWeight) : 1;
  if (isNaN(weight) || weight <= 0) {
    errors.push('shippingCostWeight must be a positive number.');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(' '));
  }

  return {
    name,
    location: body.location ? String(body.location).trim() : null,
    shippingCostWeight: String(weight),
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
  };
}

export function validateUpdateWarehouse(body = {}) {
  const clean = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 100) {
      throw new ValidationError('Warehouse name must be between 1 and 100 characters.');
    }
    clean.name = name;
  }

  if (body.location !== undefined) {
    clean.location = body.location ? String(body.location).trim() : null;
  }

  if (body.shippingCostWeight !== undefined) {
    const weight = Number(body.shippingCostWeight);
    if (isNaN(weight) || weight <= 0) {
      throw new ValidationError('shippingCostWeight must be a positive number.');
    }
    clean.shippingCostWeight = String(weight);
  }

  if (body.isActive !== undefined) {
    clean.isActive = Boolean(body.isActive);
  }

  return clean;
}

export function validateStockUpsert(body = {}) {
  const qty = Number(body.quantityOnHand);
  if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
    throw new ValidationError('quantityOnHand must be a non-negative integer.');
  }

  const threshold = body.reorderThreshold !== undefined ? Number(body.reorderThreshold) : 0;
  if (isNaN(threshold) || threshold < 0 || !Number.isInteger(threshold)) {
    throw new ValidationError('reorderThreshold must be a non-negative integer.');
  }

  return {
    quantityOnHand: qty,
    reorderThreshold: threshold,
  };
}

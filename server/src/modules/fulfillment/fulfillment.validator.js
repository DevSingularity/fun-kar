import { ValidationError } from '../../common/errors.js';

export function validateManualOverride(body = {}) {
  const overrides = body.overrides;
  if (!Array.isArray(overrides) || overrides.length === 0) {
    throw new ValidationError('Payload must contain an array of item overrides.');
  }

  const clean = [];
  for (const item of overrides) {
    if (!item.orderItemId) {
      throw new ValidationError('Each override must specify an orderItemId.');
    }
    if (!Array.isArray(item.splits) || item.splits.length === 0) {
      throw new ValidationError('Each item override must specify at least one warehouse split.');
    }

    const cleanSplits = [];
    for (const split of item.splits) {
      if (!split.warehouseId) {
        throw new ValidationError('Each split must specify a warehouseId.');
      }
      const qty = Number(split.quantity);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        throw new ValidationError('Each split quantity must be a positive integer.');
      }
      cleanSplits.push({
        warehouseId: split.warehouseId,
        quantity: qty,
      });
    }

    clean.push({
      orderItemId: item.orderItemId,
      splits: cleanSplits,
    });
  }

  return { overrides: clean };
}

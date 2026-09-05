import { ValidationError } from '../../common/errors.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateCreateRule(body) {
  const errors = [];
  if (!body.triggerProductId || !UUID_REGEX.test(body.triggerProductId)) {
    errors.push('triggerProductId is required and must be a valid UUID.');
  }
  if (!body.recommendedProductId || !UUID_REGEX.test(body.recommendedProductId)) {
    errors.push('recommendedProductId is required and must be a valid UUID.');
  }
  if (body.triggerProductId && body.recommendedProductId && body.triggerProductId === body.recommendedProductId) {
    errors.push('A product cannot recommend itself.');
  }

  const minMarginPct = body.minMarginPct !== undefined ? Number(body.minMarginPct) : 0;
  if (isNaN(minMarginPct) || minMarginPct < 0 || minMarginPct > 100) {
    errors.push('minMarginPct must be a number between 0 and 100.');
  }

  const coPurchaseScore = body.coPurchaseScore !== undefined ? Number(body.coPurchaseScore) : 0;
  if (isNaN(coPurchaseScore) || coPurchaseScore < 0) {
    errors.push('coPurchaseScore must be >= 0.');
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(' '));
  }

  return {
    triggerProductId: body.triggerProductId,
    recommendedProductId: body.recommendedProductId,
    minMarginPct: String(minMarginPct),
    coPurchaseScore: String(coPurchaseScore),
    isPromoted: !!body.isPromoted,
  };
}

export function validateUpdateRule(body) {
  const clean = {};
  if (body.minMarginPct !== undefined) {
    const val = Number(body.minMarginPct);
    if (isNaN(val) || val < 0 || val > 100) {
      throw new ValidationError('minMarginPct must be between 0 and 100.');
    }
    clean.minMarginPct = String(val);
  }
  if (body.coPurchaseScore !== undefined) {
    const val = Number(body.coPurchaseScore);
    if (isNaN(val) || val < 0) {
      throw new ValidationError('coPurchaseScore must be >= 0.');
    }
    clean.coPurchaseScore = String(val);
  }
  if (body.isPromoted !== undefined) {
    clean.isPromoted = !!body.isPromoted;
  }
  if (body.isActive !== undefined) {
    clean.isActive = !!body.isActive;
  }
  return clean;
}

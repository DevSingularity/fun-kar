import { ValidationError } from '../../common/errors.js';

const VALID_TIERS = ['DEFAULT', 'BRONZE', 'SILVER', 'GOLD'];
const VALID_APPROVAL_LEVELS = ['NONE', 'MANAGER', 'MANAGER_FINANCE'];

export function validateSetTierLimit(req, res, next) {
  const { tier, maxDiscountPct } = req.body || {};
  const errors = [];

  if (!tier || !VALID_TIERS.includes(tier)) {
    errors.push({ field: 'tier', message: `Customer tier must be one of: ${VALID_TIERS.join(', ')}` });
  }
  if (maxDiscountPct === undefined || typeof maxDiscountPct !== 'number' || maxDiscountPct < 0 || maxDiscountPct > 100) {
    errors.push({ field: 'maxDiscountPct', message: 'maxDiscountPct must be a number between 0 and 100.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for customer tier limit.', errors));
  }
  next();
}

export function validateSetCategoryLimit(req, res, next) {
  const { categoryId, maxDiscountPct } = req.body || {};
  const errors = [];

  if (!categoryId || typeof categoryId !== 'string') {
    errors.push({ field: 'categoryId', message: 'Valid categoryId is required.' });
  }
  if (maxDiscountPct === undefined || typeof maxDiscountPct !== 'number' || maxDiscountPct < 0 || maxDiscountPct > 100) {
    errors.push({ field: 'maxDiscountPct', message: 'maxDiscountPct must be a number between 0 and 100.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for category discount limit.', errors));
  }
  next();
}

export function validateCreateApprovalRule(req, res, next) {
  const { minOveragePct, maxOveragePct, requiredLevel } = req.body || {};
  const errors = [];

  if (minOveragePct === undefined || typeof minOveragePct !== 'number' || minOveragePct < 0) {
    errors.push({ field: 'minOveragePct', message: 'minOveragePct must be a non-negative number.' });
  }
  if (maxOveragePct !== undefined && maxOveragePct !== null && (typeof maxOveragePct !== 'number' || maxOveragePct <= minOveragePct)) {
    errors.push({ field: 'maxOveragePct', message: 'maxOveragePct must be a number greater than minOveragePct, or null.' });
  }
  if (!requiredLevel || !VALID_APPROVAL_LEVELS.includes(requiredLevel)) {
    errors.push({ field: 'requiredLevel', message: `requiredLevel must be one of: ${VALID_APPROVAL_LEVELS.join(', ')}` });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for approval rule.', errors));
  }
  next();
}

export function validateUpdateApprovalRule(req, res, next) {
  const { minOveragePct, maxOveragePct, requiredLevel } = req.body || {};
  const errors = [];

  if (minOveragePct !== undefined && (typeof minOveragePct !== 'number' || minOveragePct < 0)) {
    errors.push({ field: 'minOveragePct', message: 'minOveragePct must be a non-negative number.' });
  }
  if (maxOveragePct !== undefined && maxOveragePct !== null && typeof maxOveragePct !== 'number') {
    errors.push({ field: 'maxOveragePct', message: 'maxOveragePct must be a number or null.' });
  }
  if (requiredLevel !== undefined && !VALID_APPROVAL_LEVELS.includes(requiredLevel)) {
    errors.push({ field: 'requiredLevel', message: `requiredLevel must be one of: ${VALID_APPROVAL_LEVELS.join(', ')}` });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for approval rule update.', errors));
  }
  next();
}

import {
  findTierLimits,
  findTierLimitByTier,
  upsertTierLimit,
  findCategoryLimits,
  findCategoryLimitByCategoryId,
  upsertCategoryLimit,
  deleteCategoryLimit,
  findApprovalRules,
  findApprovalRuleById,
  createApprovalRule,
  updateApprovalRule,
  deleteApprovalRule,
} from './governance.repository.js';
import { findCategoryById } from '../categories/categories.repository.js';
import { NotFoundError, ValidationError } from '../../common/errors.js';

export async function getAllGovernanceConfig() {
  const [tierLimits, categoryLimits, approvalBands] = await Promise.all([
    findTierLimits(),
    findCategoryLimits(),
    findApprovalRules(),
  ]);

  return {
    tierLimits,
    categoryLimits,
    approvalBands,
  };
}

// --- Tier Limits ---
export async function getTierLimits() {
  return findTierLimits();
}

export async function setTierLimit(tier, maxDiscountPct) {
  if (maxDiscountPct < 0 || maxDiscountPct > 100) {
    throw new ValidationError('Max discount percentage must be between 0 and 100.');
  }
  return upsertTierLimit(tier, maxDiscountPct);
}

// --- Category Limits ---
export async function getCategoryLimits() {
  return findCategoryLimits();
}

export async function setCategoryLimit(categoryId, maxDiscountPct) {
  if (maxDiscountPct < 0 || maxDiscountPct > 100) {
    throw new ValidationError('Max discount percentage must be between 0 and 100.');
  }
  const category = await findCategoryById(categoryId);
  if (!category) {
    throw new NotFoundError(`Category with ID '${categoryId}' not found.`, 'CATEGORY_NOT_FOUND');
  }
  return upsertCategoryLimit(categoryId, maxDiscountPct);
}

export async function removeCategoryLimit(id) {
  const deleted = await deleteCategoryLimit(id);
  if (!deleted) {
    throw new NotFoundError(`Category discount limit with ID '${id}' not found.`, 'LIMIT_NOT_FOUND');
  }
  return deleted;
}

// --- Approval Rules ---
export async function getApprovalRules() {
  return findApprovalRules();
}

export async function addApprovalRule(data) {
  if (data.minOveragePct < 0) {
    throw new ValidationError('Min overage percentage cannot be negative.');
  }
  if (data.maxOveragePct !== undefined && data.maxOveragePct !== null) {
    if (data.maxOveragePct <= data.minOveragePct) {
      throw new ValidationError('Max overage percentage must be strictly greater than min overage percentage.');
    }
  }
  return createApprovalRule(data);
}

export async function editApprovalRule(id, data) {
  const rule = await findApprovalRuleById(id);
  if (!rule) {
    throw new NotFoundError(`Approval rule with ID '${id}' not found.`, 'RULE_NOT_FOUND');
  }

  const min = data.minOveragePct !== undefined ? data.minOveragePct : Number(rule.minOveragePct);
  const max = data.maxOveragePct !== undefined ? data.maxOveragePct : (rule.maxOveragePct !== null ? Number(rule.maxOveragePct) : null);

  if (min < 0) {
    throw new ValidationError('Min overage percentage cannot be negative.');
  }
  if (max !== null && max <= min) {
    throw new ValidationError('Max overage percentage must be strictly greater than min overage percentage.');
  }

  return updateApprovalRule(id, data);
}

export async function removeApprovalRule(id) {
  const rule = await findApprovalRuleById(id);
  if (!rule) {
    throw new NotFoundError(`Approval rule with ID '${id}' not found.`, 'RULE_NOT_FOUND');
  }
  return deleteApprovalRule(id);
}

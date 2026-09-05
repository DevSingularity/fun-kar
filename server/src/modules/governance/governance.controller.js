import { successResponse } from '../../common/response.util.js';
import {
  getAllGovernanceConfig,
  getTierLimits,
  setTierLimit,
  getCategoryLimits,
  setCategoryLimit,
  removeCategoryLimit,
  getApprovalRules,
  addApprovalRule,
  editApprovalRule,
  removeApprovalRule,
} from './governance.service.js';

export async function handleGetGovernanceOverview(req, res) {
  const config = await getAllGovernanceConfig();
  return successResponse(res, config, 200);
}

// Tier Limits
export async function handleGetTierLimits(req, res) {
  const limits = await getTierLimits();
  return successResponse(res, limits, 200);
}

export async function handleSetTierLimit(req, res) {
  const { tier, maxDiscountPct } = req.body;
  const limit = await setTierLimit(tier, maxDiscountPct);
  return successResponse(res, limit, 200);
}

// Category Limits
export async function handleGetCategoryLimits(req, res) {
  const limits = await getCategoryLimits();
  return successResponse(res, limits, 200);
}

export async function handleSetCategoryLimit(req, res) {
  const { categoryId, maxDiscountPct } = req.body;
  const limit = await setCategoryLimit(categoryId, maxDiscountPct);
  return successResponse(res, limit, 200);
}

export async function handleDeleteCategoryLimit(req, res) {
  const deleted = await removeCategoryLimit(req.params.id);
  return successResponse(res, { deleted: true, limit: deleted }, 200);
}

// Approval Rules
export async function handleGetApprovalRules(req, res) {
  const rules = await getApprovalRules();
  return successResponse(res, rules, 200);
}

export async function handleCreateApprovalRule(req, res) {
  const rule = await addApprovalRule(req.body);
  return successResponse(res, rule, 201);
}

export async function handleUpdateApprovalRule(req, res) {
  const rule = await editApprovalRule(req.params.id, req.body);
  return successResponse(res, rule, 200);
}

export async function handleDeleteApprovalRule(req, res) {
  const deleted = await removeApprovalRule(req.params.id);
  return successResponse(res, { deleted: true, rule: deleted }, 200);
}

import { successResponse } from '../../common/response.util.js';
import * as service from './intelligence.service.js';
import { validateCreateRule, validateUpdateRule } from './intelligence.validator.js';

export async function handleListRules(req, res) {
  const result = await service.listRules(req.query);
  return successResponse(res, result.items, 200, result.meta);
}

export async function handleGetRule(req, res) {
  const rule = await service.getRuleById(req.params.id);
  return successResponse(res, rule, 200);
}

export async function handleCreateRule(req, res) {
  const validated = validateCreateRule(req.body);
  const rule = await service.createRule(validated);
  return successResponse(res, rule, 201);
}

export async function handleUpdateRule(req, res) {
  const validated = validateUpdateRule(req.body);
  const rule = await service.updateRule(req.params.id, validated);
  return successResponse(res, rule, 200);
}

export async function handleDeleteRule(req, res) {
  const rule = await service.deleteRule(req.params.id);
  return successResponse(res, rule, 200);
}

export async function handleSuggestForQuotation(req, res) {
  const result = await service.suggestForQuotation(req.params.id, req.user, req.query.limit);
  return successResponse(res, result, 200);
}

export async function handleAddSuggestionToQuote(req, res) {
  const result = await service.addSuggestionToQuote(req.params.id, req.params.ruleId, req.user);
  return successResponse(res, result, 201);
}

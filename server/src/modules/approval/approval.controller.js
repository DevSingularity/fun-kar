import { successResponse } from '../../common/response.util.js';
import * as service from './approval.service.js';
import { validateApprove, validateRejectOrReturn } from './approval.validator.js';

export async function handleListApprovalRequests(req, res) {
  const result = await service.listApprovalRequests(req.query, req.user);
  return successResponse(res, result.items, 200, result.meta);
}

export async function handleGetApprovalDetail(req, res) {
  const result = await service.getApprovalDetail(req.params.id, req.user);
  return successResponse(res, result, 200);
}

export async function handleApproveRequest(req, res) {
  const validated = validateApprove(req.body);
  const result = await service.approveRequest(req.params.id, validated, req.user);
  return successResponse(res, result, 200);
}

export async function handleRejectRequest(req, res) {
  const validated = validateRejectOrReturn(req.body);
  const result = await service.rejectRequest(req.params.id, validated, req.user);
  return successResponse(res, result, 200);
}

export async function handleReturnRequest(req, res) {
  const validated = validateRejectOrReturn(req.body);
  const result = await service.returnRequest(req.params.id, validated, req.user);
  return successResponse(res, result, 200);
}

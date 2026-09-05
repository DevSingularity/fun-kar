import { successResponse } from '../../common/response.util.js';
import * as service from './dealHealth.service.js';

export async function handleListDealHealth(req, res) {
  const result = await service.listDealHealth(req.query, req.user);
  return successResponse(res, result, 200);
}

export async function handleGetDealDetail(req, res) {
  const result = await service.getDealDetail(req.params.quotationId, req.user);
  return successResponse(res, result, 200);
}

export async function handleNudgeDeal(req, res) {
  const result = await service.nudgeDeal(req.params.quotationId, req.body, req.user);
  return successResponse(res, result, 200);
}

export async function handleEscalateDeal(req, res) {
  const result = await service.escalateDeal(req.params.quotationId, req.body, req.user);
  return successResponse(res, result, 200);
}

export async function handleAddDealComment(req, res) {
  const result = await service.addDealComment(req.params.quotationId, req.body, req.user);
  return successResponse(res, result, 201);
}

export async function handleAcknowledgeAlert(req, res) {
  const result = await service.acknowledgeAlert(req.params.alertId, req.user);
  return successResponse(res, result, 200);
}

export async function handleEscalateAlert(req, res) {
  const result = await service.escalateAlert(req.params.alertId, req.user);
  return successResponse(res, result, 200);
}

import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import * as service from './subscriptionPlans.service.js';

export const listPlans = asyncHandler(async (req, res) => {
  const items = await service.listPlans(req.query);
  return successResponse(res, items, 200);
});

export const getPlan = asyncHandler(async (req, res) => {
  const plan = await service.getPlan(req.params.id);
  return successResponse(res, plan, 200);
});

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await service.addPlan(req.body);
  return successResponse(res, plan, 201);
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await service.editPlan(req.params.id, req.body);
  return successResponse(res, plan, 200);
});

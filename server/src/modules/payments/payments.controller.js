import * as service from './payments.service.js';
import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const recordPayment = asyncHandler(async (req, res) => {
  const result = await service.recordPayment(req.params.id, req.body, req.user);
  return successResponse(res, result, 201);
});

export const listPayments = asyncHandler(async (req, res) => {
  const result = await service.listPayments(req.params.id, req.query, req.user);
  return successResponse(res, result.items, 200, result.meta);
});

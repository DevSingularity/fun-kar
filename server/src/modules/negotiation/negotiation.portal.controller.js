import * as service from './negotiation.service.js';
import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const createRequest = asyncHandler(async (req, res) => {
  const result = await service.createRequestAsCustomer(req.params.id, req.body, req.portalAuth);
  return successResponse(res, result, 201);
});

export const addComment = asyncHandler(async (req, res) => {
  const result = await service.addCommentAsCustomer(req.params.id, req.body, req.portalAuth);
  return successResponse(res, result, 201);
});

export const getTimeline = asyncHandler(async (req, res) => {
  const result = await service.getTimeline(req.params.id);
  return successResponse(res, result);
});

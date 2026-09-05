import * as service from './negotiation.service.js';
import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const listRequests = asyncHandler(async (req, res) => {
  const result = await service.listRequests(req.params.id, req.query, req.user);
  return successResponse(res, result.items, 200, result.meta);
});

export const getTimeline = asyncHandler(async (req, res) => {
  const result = await service.getTimeline(req.params.id);
  return successResponse(res, result);
});

export const addComment = asyncHandler(async (req, res) => {
  const result = await service.addCommentAsInternal(req.params.id, req.body, req.user);
  return successResponse(res, result, 201);
});

export const resolveRequest = asyncHandler(async (req, res) => {
  const result = await service.resolveRequest(req.params.id, req.body, req.user);
  return successResponse(res, result);
});

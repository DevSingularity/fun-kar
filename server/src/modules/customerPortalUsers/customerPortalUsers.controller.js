import * as service from './customerPortalUsers.service.js';
import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const listPortalUsers = asyncHandler(async (req, res) => {
  const result = await service.listPortalUsers(req.params.customerId, req.query, req.user);
  return successResponse(res, result.items, 200, result.meta);
});

export const createPortalUser = asyncHandler(async (req, res) => {
  const result = await service.createPortalUser(req.params.customerId, req.body, req.user);
  return successResponse(res, { portalUser: result }, 201);
});

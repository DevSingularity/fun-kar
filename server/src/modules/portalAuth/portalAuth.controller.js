import * as service from './portalAuth.service.js';
import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const requestMagicLink = asyncHandler(async (req, res) => {
  const result = await service.requestMagicLink(req.body.email);
  return successResponse(res, result);
});

export const consumeMagicLink = asyncHandler(async (req, res) => {
  const result = await service.consumeMagicLink(req.body.token);
  return successResponse(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  return successResponse(res, result);
});

export const me = asyncHandler(async (req, res) => {
  const result = await service.me(req.portalAuth.customerUserId);
  return successResponse(res, result);
});

import * as service from './portalQuotes.service.js';
import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const listQuotes = asyncHandler(async (req, res) => {
  const result = await service.listQuotes(req.portalAuth, req.query);
  return successResponse(res, result.items, 200, result.meta);
});

export const getQuoteDetail = asyncHandler(async (req, res) => {
  const customerId = service.resolveCallerCustomerId(req);
  const result = await service.getQuoteDetail(req.params.id, customerId);
  return successResponse(res, { quotation: result });
});

export const confirmQuote = asyncHandler(async (req, res) => {
  const result = await service.confirmQuote(req.params.id, req.portalAuth);
  return successResponse(res, result, 200, result.alreadyConfirmed ? { alreadyConfirmed: true } : undefined);
});

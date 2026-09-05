import * as service from './quotationSharing.service.js';
import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';

export const shareQuotation = asyncHandler(async (req, res) => {
  const result = await service.shareQuotation(req.params.id, req.user);
  return successResponse(res, result);
});

import { successResponse } from '../../common/response.util.js';
import * as service from './fulfillment.service.js';
import { validateManualOverride } from './fulfillment.validator.js';

export async function handleCreateOrderFromQuotation(req, res) {
  const result = await service.createOrderFromQuotation(req.params.quotationId, req.user);
  return successResponse(res, result, result.alreadyExisted ? 200 : 201, {
    alreadyExisted: result.alreadyExisted,
  });
}

export async function handleGetOrderFulfillmentDetail(req, res) {
  const result = await service.getOrderFulfillmentDetail(req.params.id, req.user);
  return successResponse(res, result, 200);
}

export async function handleAllocateOrder(req, res) {
  const result = await service.allocateOrder(req.params.id, req.user);
  return successResponse(res, result, 200);
}

export async function handleOverrideAllocation(req, res) {
  const validated = validateManualOverride(req.body);
  const result = await service.overrideAllocation(req.params.id, validated, req.user);
  return successResponse(res, result, 200);
}

export async function handleConsolidateBackorder(req, res) {
  const result = await service.consolidateBackorder(req.params.id, req.user);
  return successResponse(res, result, 200);
}

export async function handleListFulfillmentOrders(req, res) {
  const result = await service.listFulfillmentOrders(req.query);
  return successResponse(res, result.items, 200, result.meta);
}

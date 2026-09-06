import { successResponse } from '../../common/response.util.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import * as service from './billing.service.js';

export const generateBillingForOrder = asyncHandler(async (req, res) => {
  const result = await service.generateBillingForOrder(req.params.id, req.user);
  return successResponse(res, result, result.alreadyExisted ? 200 : 201);
});

export const listInvoices = asyncHandler(async (req, res) => {
  const result = await service.listInvoices(req.query, req.user);
  return successResponse(res, result.items, 200, result.meta);
});

export const getInvoiceDetail = asyncHandler(async (req, res) => {
  const invoice = await service.getInvoiceDetail(req.params.id, req.user);
  return successResponse(res, invoice, 200);
});

export const listSubscriptions = asyncHandler(async (req, res) => {
  const result = await service.listSubscriptions(req.query, req.user);
  return successResponse(res, { items: result.items, statusCounts: result.statusCounts }, 200, result.meta);
});

export const getSubscriptionDetail = asyncHandler(async (req, res) => {
  const subscription = await service.getSubscriptionDetail(req.params.id, req.user);
  return successResponse(res, subscription, 200);
});

export const pauseSubscription = asyncHandler(async (req, res) => {
  const result = await service.pauseSubscription(req.params.id, req.user);
  return successResponse(res, result, 200);
});

export const resumeSubscription = asyncHandler(async (req, res) => {
  const result = await service.resumeSubscription(req.params.id, req.user);
  return successResponse(res, result, 200);
});

export const changeSubscription = asyncHandler(async (req, res) => {
  const result = await service.changeSubscription(req.params.id, req.body, req.user);
  return successResponse(res, result, 200);
});

export const cancelSubscription = asyncHandler(async (req, res) => {
  const result = await service.cancelSubscription(req.params.id, req.body, req.user);
  return successResponse(res, result, 200);
});

export const invoiceBillingSchedule = asyncHandler(async (req, res) => {
  const result = await service.invoiceBillingSchedule(req.params.id, req.user);
  return successResponse(res, result, 200);
});

export const getReconciliationOverview = asyncHandler(async (req, res) => {
  const result = await service.getReconciliationOverview();
  return successResponse(res, result, 200);
});

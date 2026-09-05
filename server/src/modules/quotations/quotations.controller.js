import { successResponse } from '../../common/response.util.js';
import {
  getQuotation,
  listQuotations,
  getPipeline,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  addLineItem,
  updateLineItem,
  removeLineItem,
  submitQuotation,
} from './quotations.service.js';

export async function handleListQuotations(req, res) {
  const result = await listQuotations(req.query, req.user);
  return successResponse(res, result.quotations, 200, result.meta);
}

export async function handleGetPipeline(req, res) {
  const result = await getPipeline(req.user);
  return successResponse(res, result, 200);
}

export async function handleGetQuotation(req, res) {
  const quotation = await getQuotation(req.params.id, req.user);
  return successResponse(res, quotation, 200);
}

export async function handleCreateQuotation(req, res) {
  const quotation = await createQuotation(req.body, req.user);
  return successResponse(res, quotation, 201);
}

export async function handleUpdateQuotation(req, res) {
  const quotation = await updateQuotation(req.params.id, req.body, req.user);
  return successResponse(res, quotation, 200);
}

export async function handleDeleteQuotation(req, res) {
  const result = await deleteQuotation(req.params.id, req.user);
  return successResponse(res, result, 200);
}

export async function handleAddLineItem(req, res) {
  const quotation = await addLineItem(req.params.id, req.body, req.user);
  return successResponse(res, quotation, 201);
}

export async function handleUpdateLineItem(req, res) {
  const quotation = await updateLineItem(req.params.id, req.params.itemId, req.body, req.user);
  return successResponse(res, quotation, 200);
}

export async function handleRemoveLineItem(req, res) {
  const quotation = await removeLineItem(req.params.id, req.params.itemId, req.user);
  return successResponse(res, quotation, 200);
}

export async function handleSubmitQuotation(req, res) {
  const result = await submitQuotation(req.params.id, req.user);
  return successResponse(res, result, 200);
}

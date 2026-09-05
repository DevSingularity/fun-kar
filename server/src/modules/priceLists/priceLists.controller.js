import { successResponse } from '../../common/response.util.js';
import { parseListQuery } from '../../common/pagination.util.js';
import {
  listPriceLists,
  getPriceList,
  addPriceList,
  editPriceList,
  addOrUpdateItem,
  removeItem,
  resolvePrice,
} from './priceLists.service.js';

export async function handleListPriceLists(req, res) {
  const query = parseListQuery(req.query);
  const result = await listPriceLists(query);
  return successResponse(res, result.priceLists, 200, result.meta);
}

export async function handleGetPriceList(req, res) {
  const priceList = await getPriceList(req.params.id);
  return successResponse(res, priceList, 200);
}

export async function handleCreatePriceList(req, res) {
  const priceList = await addPriceList(req.body);
  return successResponse(res, priceList, 201);
}

export async function handleUpdatePriceList(req, res) {
  const priceList = await editPriceList(req.params.id, req.body);
  return successResponse(res, priceList, 200);
}

export async function handleUpsertItem(req, res) {
  const item = await addOrUpdateItem(req.params.id, req.body);
  return successResponse(res, item, 200);
}

export async function handleDeleteItem(req, res) {
  const item = await removeItem(req.params.id, req.params.itemId);
  return successResponse(res, { deleted: true, item }, 200);
}

export async function handleResolvePrice(req, res) {
  const { customerId, productId, quantity, requestedDiscountPct } = req.query;
  const result = await resolvePrice({
    customerId,
    productId,
    quantity: quantity ? parseInt(quantity, 10) : 1,
    requestedDiscountPct: requestedDiscountPct ? parseFloat(requestedDiscountPct) : 0,
  });
  return successResponse(res, result, 200);
}

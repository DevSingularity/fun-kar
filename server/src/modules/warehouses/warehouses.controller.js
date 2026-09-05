import { successResponse } from '../../common/response.util.js';
import * as service from './warehouses.service.js';
import {
  validateCreateWarehouse,
  validateUpdateWarehouse,
  validateStockUpsert,
} from './warehouses.validator.js';

export async function handleListWarehouses(req, res) {
  const result = await service.listWarehouses(req.query);
  return successResponse(res, result.items, 200, result.meta);
}

export async function handleGetWarehouse(req, res) {
  const warehouse = await service.getWarehouseById(req.params.id);
  return successResponse(res, warehouse, 200);
}

export async function handleCreateWarehouse(req, res) {
  const validated = validateCreateWarehouse(req.body);
  const warehouse = await service.createWarehouse(validated);
  return successResponse(res, warehouse, 201);
}

export async function handleUpdateWarehouse(req, res) {
  const validated = validateUpdateWarehouse(req.body);
  const warehouse = await service.updateWarehouse(req.params.id, validated);
  return successResponse(res, warehouse, 200);
}

export async function handleListWarehouseStock(req, res) {
  const result = await service.listWarehouseStock(req.params.id, req.query);
  return successResponse(res, result.items, 200, result.meta);
}

export async function handleSetWarehouseStock(req, res) {
  const validated = validateStockUpsert(req.body);
  const stock = await service.setWarehouseStock(req.params.id, req.params.productId, validated);
  return successResponse(res, stock, 200);
}

export async function handleGetLiveStockOverview(req, res) {
  const stock = await service.getLiveStockOverview();
  return successResponse(res, stock, 200);
}

import * as repo from './warehouses.repository.js';
import { findProductById } from '../products/products.repository.js';
import { NotFoundError, ConflictError } from '../../common/errors.js';

export async function listWarehouses(query = {}) {
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const offset = Math.max(0, Number(query.offset) || 0);
  const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;

  const { rows, total } = await repo.listWarehouses({
    isActive,
    search: query.search,
    offset,
    limit,
  });

  return {
    items: rows,
    meta: {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      hasMore: offset + rows.length < total,
    },
  };
}

export async function getWarehouseById(id) {
  const warehouse = await repo.findWarehouseById(id);
  if (!warehouse) {
    throw new NotFoundError(`Warehouse with ID '${id}' not found.`, 'WAREHOUSE_NOT_FOUND');
  }
  return warehouse;
}

export async function createWarehouse(payload) {
  try {
    return await repo.insertWarehouse(payload);
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError(`Warehouse with name '${payload.name}' already exists.`, 'WAREHOUSE_EXISTS');
    }
    throw err;
  }
}

export async function updateWarehouse(id, payload) {
  await getWarehouseById(id);
  try {
    return await repo.updateWarehouse(id, payload);
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError(`Warehouse with name '${payload.name}' already exists.`, 'WAREHOUSE_EXISTS');
    }
    throw err;
  }
}

export async function listWarehouseStock(warehouseId, query = {}) {
  await getWarehouseById(warehouseId);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const offset = Math.max(0, Number(query.offset) || 0);

  const { rows, total } = await repo.listStockForWarehouse(warehouseId, { offset, limit });

  return {
    items: rows,
    meta: {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      hasMore: offset + rows.length < total,
    },
  };
}

export async function setWarehouseStock(warehouseId, productId, payload) {
  await getWarehouseById(warehouseId);
  const product = await findProductById(productId);
  if (!product) {
    throw new NotFoundError(`Product with ID '${productId}' not found.`, 'PRODUCT_NOT_FOUND');
  }

  return repo.upsertStock(warehouseId, productId, payload);
}

export async function getLiveStockOverview() {
  return repo.getAggregatedLiveStock();
}

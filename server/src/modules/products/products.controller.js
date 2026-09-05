import { successResponse } from '../../common/response.util.js';
import { parseListQuery } from '../../common/pagination.util.js';
import {
  listProducts,
  getProduct,
  addProduct,
  editProduct,
  softDeleteProduct,
} from './products.service.js';

import { findActiveProductsForPortal } from './products.repository.js';

export async function handleListProducts(req, res) {
  const query = parseListQuery(req.query);
  const result = await listProducts({
    ...query,
    categoryId: req.query.categoryId,
    productType: req.query.productType,
    isActive: req.query.isActive,
  });
  return successResponse(res, result.products, 200, result.meta);
}

export async function listActiveCatalog(req, res) {
  const items = await findActiveProductsForPortal({
    search: req.query.search,
    limit: Math.min(100, Number(req.query.limit) || 50),
    offset: Number(req.query.offset) || 0,
  });
  return successResponse(res, items, 200);
}

export async function handleGetProduct(req, res) {
  const product = await getProduct(req.params.id);
  return successResponse(res, product, 200);
}

export async function handleCreateProduct(req, res) {
  const product = await addProduct(req.body);
  return successResponse(res, product, 201);
}

export async function handleUpdateProduct(req, res) {
  const product = await editProduct(req.params.id, req.body);
  return successResponse(res, product, 200);
}

export async function handleDeleteProduct(req, res) {
  const product = await softDeleteProduct(req.params.id);
  return successResponse(res, { deleted: true, product }, 200);
}


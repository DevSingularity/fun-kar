import { successResponse } from '../../common/response.util.js';
import { parseListQuery } from '../../common/pagination.util.js';
import {
  listCategories,
  getCategory,
  addCategory,
  editCategory,
  removeCategory,
} from './categories.service.js';

export async function handleListCategories(req, res) {
  const query = parseListQuery(req.query);
  const result = await listCategories(query);
  return successResponse(res, result.categories, 200, result.meta);
}

export async function handleGetCategory(req, res) {
  const category = await getCategory(req.params.id);
  return successResponse(res, category, 200);
}

export async function handleCreateCategory(req, res) {
  const category = await addCategory(req.body);
  return successResponse(res, category, 201);
}

export async function handleUpdateCategory(req, res) {
  const category = await editCategory(req.params.id, req.body);
  return successResponse(res, category, 200);
}

export async function handleDeleteCategory(req, res) {
  const category = await removeCategory(req.params.id);
  return successResponse(res, { deleted: true, category }, 200);
}

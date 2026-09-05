import {
  findCategories,
  findCategoryById,
  findCategoryByName,
  createCategory,
  updateCategory,
  countProductsInCategory,
  deleteCategory,
} from './categories.repository.js';
import { NotFoundError, ConflictError } from '../../common/errors.js';
import { buildMeta } from '../../common/pagination.util.js';

export async function listCategories(query = {}) {
  const { items, total } = await findCategories({
    search: query.search,
    limit: query.limit,
    offset: query.offset,
  });
  const meta = buildMeta(total, query.page || 1, query.limit || 20);
  return { categories: items, meta };
}

export async function getCategory(id) {
  const category = await findCategoryById(id);
  if (!category) {
    throw new NotFoundError(`Product category with ID '${id}' not found.`, 'CATEGORY_NOT_FOUND');
  }
  return category;
}

export async function addCategory({ name, description }) {
  const existing = await findCategoryByName(name);
  if (existing) {
    throw new ConflictError(`Category with name '${name}' already exists.`, 'DUPLICATE_CATEGORY_NAME');
  }
  return createCategory({ name, description });
}

export async function editCategory(id, data) {
  const category = await getCategory(id);
  if (data.name && data.name.toLowerCase().trim() !== category.name.toLowerCase()) {
    const existing = await findCategoryByName(data.name);
    if (existing) {
      throw new ConflictError(`Category with name '${data.name}' already exists.`, 'DUPLICATE_CATEGORY_NAME');
    }
  }
  return updateCategory(id, data);
}

export async function removeCategory(id) {
  await getCategory(id);
  const productsCount = await countProductsInCategory(id);
  if (productsCount > 0) {
    throw new ConflictError(
      `Cannot delete category. It has ${productsCount} associated products. Reassign products first.`,
      'CATEGORY_IN_USE'
    );
  }
  return deleteCategory(id);
}

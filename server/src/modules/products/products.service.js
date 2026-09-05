import {
  findProducts,
  findProductById,
  findProductBySku,
  createProduct,
  updateProduct,
  createProductVariant,
} from './products.repository.js';
import { findCategoryById } from '../categories/categories.repository.js';
import { NotFoundError, ConflictError, ValidationError } from '../../common/errors.js';
import { buildMeta } from '../../common/pagination.util.js';

export async function listProducts(query = {}) {
  const { items, total } = await findProducts({
    search: query.search,
    categoryId: query.categoryId,
    productType: query.productType,
    isActive: query.isActive !== undefined ? query.isActive === 'true' || query.isActive === true : undefined,
    limit: query.limit,
    offset: query.offset,
  });
  const meta = buildMeta(total, query.page || 1, query.limit || 20);
  return { products: items, meta };
}

export async function getProduct(id) {
  const product = await findProductById(id);
  if (!product) {
    throw new NotFoundError(`Product with ID '${id}' not found.`, 'PRODUCT_NOT_FOUND');
  }
  return product;
}

export async function addProduct(data) {
  const category = await findCategoryById(data.categoryId);
  if (!category) {
    throw new NotFoundError(`Category with ID '${data.categoryId}' does not exist.`, 'CATEGORY_NOT_FOUND');
  }

  const existingSku = await findProductBySku(data.sku);
  if (existingSku) {
    throw new ConflictError(`Product with SKU '${data.sku}' already exists.`, 'DUPLICATE_SKU');
  }

  const basePrice = Number(data.basePrice);
  const estimatedCost = Number(data.estimatedCost || 0);

  if (basePrice < 0) throw new ValidationError('Base price cannot be negative.');
  if (estimatedCost < 0) throw new ValidationError('Estimated cost cannot be negative.');

  const product = await createProduct(data);

  if (Array.isArray(data.variants) && data.variants.length > 0) {
    for (const v of data.variants) {
      await createProductVariant({
        productId: product.id,
        attributeName: v.attributeName,
        attributeValue: v.attributeValue,
        extraPrice: v.extraPrice,
        sku: v.sku,
      });
    }
  }

  return getProduct(product.id);
}

export async function editProduct(id, data) {
  const product = await getProduct(id);

  if (data.categoryId) {
    const category = await findCategoryById(data.categoryId);
    if (!category) {
      throw new NotFoundError(`Category with ID '${data.categoryId}' does not exist.`, 'CATEGORY_NOT_FOUND');
    }
  }

  if (data.sku && data.sku.toUpperCase().trim() !== product.sku.toUpperCase()) {
    const existingSku = await findProductBySku(data.sku);
    if (existingSku) {
      throw new ConflictError(`Product with SKU '${data.sku}' already exists.`, 'DUPLICATE_SKU');
    }
  }

  await updateProduct(id, data);
  return getProduct(id);
}

export async function softDeleteProduct(id) {
  await getProduct(id);
  return updateProduct(id, { isActive: false });
}

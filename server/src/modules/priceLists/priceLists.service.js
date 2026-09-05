import {
  findPriceLists,
  findPriceListById,
  createPriceList,
  updatePriceList,
  upsertPriceListItem,
  deletePriceListItem,
  findTierPriceForProduct,
} from './priceLists.repository.js';
import { findProductById } from '../products/products.repository.js';
import { findCustomerById } from '../customers/customers.repository.js';
import { NotFoundError, ValidationError } from '../../common/errors.js';
import { buildMeta } from '../../common/pagination.util.js';

export async function listPriceLists(query = {}) {
  const { items, total } = await findPriceLists({
    limit: query.limit,
    offset: query.offset,
  });
  const meta = buildMeta(total, query.page || 1, query.limit || 20);
  return { priceLists: items, meta };
}

export async function getPriceList(id) {
  const list = await findPriceListById(id);
  if (!list) {
    throw new NotFoundError(`Price list with ID '${id}' not found.`, 'PRICE_LIST_NOT_FOUND');
  }
  return list;
}

export async function addPriceList(data) {
  return createPriceList(data);
}

export async function editPriceList(id, data) {
  await getPriceList(id);
  return updatePriceList(id, data);
}

export async function addOrUpdateItem(priceListId, itemData) {
  await getPriceList(priceListId);
  const product = await findProductById(itemData.productId);
  if (!product) {
    throw new NotFoundError(`Product '${itemData.productId}' does not exist.`, 'PRODUCT_NOT_FOUND');
  }

  if (isNaN(Number(itemData.unitPrice)) || Number(itemData.unitPrice) < 0) {
    throw new ValidationError('Unit price must be a non-negative number.');
  }

  return upsertPriceListItem({
    priceListId,
    productId: itemData.productId,
    customerTier: itemData.customerTier,
    unitPrice: itemData.unitPrice,
  });
}

export async function removeItem(priceListId, itemId) {
  await getPriceList(priceListId);
  return deletePriceListItem(priceListId, itemId);
}

/**
 * Dynamic Pricing Resolver
 * Resolves the unit price and margin for a product given a customer context
 */
export async function resolvePrice({ customerId, productId, quantity = 1, requestedDiscountPct = 0 }) {
  if (!productId) {
    throw new ValidationError('Product ID is required for pricing resolution.');
  }

  const product = await findProductById(productId);
  if (!product) {
    throw new NotFoundError(`Product '${productId}' not found.`, 'PRODUCT_NOT_FOUND');
  }

  let customer = null;
  let customerTier = 'BRONZE';
  let priceListId = null;

  if (customerId) {
    customer = await findCustomerById(customerId);
    if (customer) {
      customerTier = customer.tier || 'BRONZE';
      priceListId = customer.priceListId;
    }
  }

  const basePrice = Number(product.basePrice);
  const estimatedCost = Number(product.estimatedCost || 0);
  let resolvedUnitPrice = basePrice;
  let hasTierOverride = false;

  if (priceListId) {
    const tierItem = await findTierPriceForProduct(priceListId, productId, customerTier);
    if (tierItem) {
      resolvedUnitPrice = Number(tierItem.unitPrice);
      hasTierOverride = true;
    }
  }

  const discountPct = Math.max(0, Math.min(100, Number(requestedDiscountPct) || 0));
  const effectiveUnitPrice = resolvedUnitPrice * (1 - discountPct / 100);
  const totalAmount = effectiveUnitPrice * Math.max(1, Number(quantity));
  
  const unitMargin = effectiveUnitPrice - estimatedCost;
  const marginPct = effectiveUnitPrice > 0 ? (unitMargin / effectiveUnitPrice) * 100 : 0;

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    customerId: customer?.id || null,
    customerName: customer?.name || null,
    customerTier,
    basePrice,
    tierPrice: resolvedUnitPrice,
    hasTierOverride,
    requestedDiscountPct: discountPct,
    effectiveUnitPrice: Number(effectiveUnitPrice.toFixed(2)),
    quantity: Number(quantity),
    totalAmount: Number(totalAmount.toFixed(2)),
    estimatedCost,
    unitMargin: Number(unitMargin.toFixed(2)),
    estimatedMarginPct: Number(marginPct.toFixed(2)),
    taxRate: Number(product.taxRate || 0),
    currency: 'INR',
  };
}

import {
  lockById,
  insertHeader,
  findByIdJoined,
  findItemsJoined,
  findLatestApprovalRequest,
  listQuotations as repoListQuotations,
  listForPipeline,
  insertItem,
  findItemById,
  updateItem as repoUpdateItem,
  deleteItem as repoDeleteItem,
  applyAggregateTotals,
  updateHeaderFields,
  applySubmitResult,
  deleteHeader,
  insertAuditLog,
} from './quotations.repository.js';
import { computeLineTotals, computeQuotationTotals, marginHealthLabel } from './quotations.calc.js';
import { getProduct } from '../products/products.service.js';
import { resolvePrice } from '../priceLists/priceLists.service.js';
import { resolveAllowedDiscount, evaluateQuoteRisk } from '../risk/risk.service.js';
import { createIfRequired } from '../approval/approval.service.js';
import { getPendingByQuotationId, resolveRequest } from '../approval/approval.repository.js';
import { findCustomerById } from '../customers/customers.repository.js';
import { findUserById } from '../auth/auth.repository.js';
import { nextQuoteNumber } from '../../common/sequence.util.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../common/errors.js';
import { buildMeta, parseListQuery } from '../../common/pagination.util.js';

function assertOwnership(quotation, authUser) {
  if (!authUser) return;
  if (authUser.role === 'SALES_REP' && quotation.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have permission to access or modify this quotation.');
  }
}

export async function getQuotation(id, authUser) {
  const joined = await findByIdJoined(id);
  if (!joined) {
    throw new NotFoundError(`Quotation with ID '${id}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(joined.quotation, authUser);

  const itemsJoined = await findItemsJoined(id);
  const items = itemsJoined.map((r) => ({
    ...r.item,
    productName: r.productName,
    productSku: r.productSku,
    categoryName: r.categoryName,
    productType: r.productType,
    unit: r.unit,
  }));

  const latestApprovalRequest = await findLatestApprovalRequest(id);
  const marginPct = Number(joined.quotation.estimatedMarginPct || 0);

  return {
    quotation: joined.quotation,
    customer: {
      id: joined.quotation.customerId,
      name: joined.customerName,
      email: joined.customerEmail,
      tier: joined.customerTier,
      billingAddress: joined.customerBillingAddress,
    },
    salesRep: {
      id: joined.quotation.salesRepId,
      name: joined.salesRepName,
      email: joined.salesRepEmail,
    },
    items,
    latestApprovalRequest,
    marginHealth: marginHealthLabel(marginPct),
  };
}

export async function listQuotations(rawQuery = {}, authUser) {
  const pagination = parseListQuery(rawQuery);
  const scopedSalesRepId = authUser?.role === 'SALES_REP' ? authUser.id : rawQuery.salesRepId;

  const { items, total } = await repoListQuotations({
    status: rawQuery.status,
    customerId: rawQuery.customerId,
    salesRepId: scopedSalesRepId,
    search: rawQuery.search,
    offset: pagination.offset,
    limit: pagination.limit,
  });

  const meta = buildMeta(total, pagination.page, pagination.limit);
  return { quotations: items, meta };
}

export async function getPipeline(authUser) {
  const scopedSalesRepId = authUser?.role === 'SALES_REP' ? authUser.id : null;
  const rows = await listForPipeline({ salesRepId: scopedSalesRepId });

  const COLUMNS = [
    { status: 'DRAFT', label: 'Draft' },
    { status: 'PENDING_APPROVAL', label: 'Pending Approval' },
    { status: 'APPROVED', label: 'Approved' },
    { status: 'UNDER_NEGOTIATION', label: 'Under Negotiation' },
    { status: 'CONFIRMED', label: 'Confirmed' },
    { status: 'FULFILLING', label: 'Fulfillment' },
    { status: 'COMPLETED', label: 'Completed' },
  ];

  const columns = COLUMNS.map((col) => {
    const cards = rows.filter((r) => r.status === col.status);
    const totalAmount = cards.reduce((sum, r) => sum + Number(r.grandTotal || 0), 0);
    return {
      status: col.status,
      label: col.label,
      count: cards.length,
      totalAmount: Number(totalAmount.toFixed(2)),
      quotations: cards,
    };
  });

  return { columns };
}

export async function createQuotation(data, authUser) {
  const customer = await findCustomerById(data.customerId);
  if (!customer) {
    throw new NotFoundError(`Customer with ID '${data.customerId}' not found.`, 'CUSTOMER_NOT_FOUND');
  }

  if (authUser?.role === 'SALES_REP' && customer.assignedRepId !== authUser.id) {
    throw new ForbiddenError('You can only create quotations for customers assigned to you.');
  }

  let assignedRepId = authUser?.id;
  if (data.salesRepId) {
    if (authUser && !['ADMIN', 'SALES_MANAGER'].includes(authUser.role) && data.salesRepId !== authUser.id) {
      throw new ForbiddenError('Only a Sales Manager or Admin can assign a quotation to another representative.');
    }
    const rep = await findUserById(data.salesRepId);
    if (!rep) {
      throw new NotFoundError(`Sales representative '${data.salesRepId}' not found.`, 'REP_NOT_FOUND');
    }
    assignedRepId = data.salesRepId;
  }

  const quoteNumber = await nextQuoteNumber();

  const quotation = await insertHeader({
    quoteNumber,
    customerId: data.customerId,
    salesRepId: assignedRepId,
    promisedDeliveryDate: data.promisedDeliveryDate || null,
  });

  return getQuotation(quotation.id, authUser);
}

export async function updateQuotation(id, data, authUser) {
  const existing = await lockById(id);
  if (!existing) {
    throw new NotFoundError(`Quotation with ID '${id}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(existing, authUser);

  if (existing.status !== 'DRAFT') {
    throw new ConflictError('Only DRAFT quotations can be edited.', 'INVALID_STATE');
  }

  if (data.customerId && data.customerId !== existing.customerId) {
    const newCustomer = await findCustomerById(data.customerId);
    if (!newCustomer) {
      throw new NotFoundError(`Customer with ID '${data.customerId}' not found.`, 'CUSTOMER_NOT_FOUND');
    }
    if (authUser?.role === 'SALES_REP' && newCustomer.assignedRepId !== authUser.id) {
      throw new ForbiddenError('You can only move this quotation to a customer assigned to you.');
    }
  }

  if (data.salesRepId && data.salesRepId !== existing.salesRepId) {
    if (authUser && !['ADMIN', 'SALES_MANAGER'].includes(authUser.role)) {
      throw new ForbiddenError('Only a Sales Manager or Admin can reassign quotations.');
    }
    const rep = await findUserById(data.salesRepId);
    if (!rep) {
      throw new NotFoundError(`Sales representative '${data.salesRepId}' not found.`, 'REP_NOT_FOUND');
    }
  }

  await updateHeaderFields(id, data);
  return getQuotation(id, authUser);
}

export async function deleteQuotation(id, authUser) {
  const existing = await lockById(id);
  if (!existing) {
    throw new NotFoundError(`Quotation with ID '${id}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(existing, authUser);

  if (existing.status !== 'DRAFT') {
    throw new ConflictError('Only DRAFT quotations can be deleted.', 'INVALID_STATE');
  }

  await deleteHeader(id);
  return { deleted: true, quotationId: id };
}

// --- Line Items CRUD ---

async function recomputeAndPersistTotals(quotationId) {
  const itemsJoined = await findItemsJoined(quotationId);
  const items = itemsJoined.map((r) => r.item);
  const totals = computeQuotationTotals(items);
  await applyAggregateTotals(quotationId, totals);
  return totals;
}

export async function addLineItem(quotationId, itemData, authUser) {
  const quotation = await lockById(quotationId);
  if (!quotation) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(quotation, authUser);

  if (quotation.status !== 'DRAFT') {
    throw new ConflictError('Line items can only be added to DRAFT quotations.', 'INVALID_STATE');
  }

  const product = await getProduct(itemData.productId);
  if (!product.isActive) {
    throw new ConflictError(`Product '${product.name}' is inactive and cannot be quoted.`, 'PRODUCT_INACTIVE');
  }

  const customer = await findCustomerById(quotation.customerId);
  const pricing = await resolvePrice({
    customerId: quotation.customerId,
    productId: product.id,
    quantity: itemData.quantity,
    requestedDiscountPct: itemData.discountPct || 0,
  });

  const allowedDiscountPct = await resolveAllowedDiscount(customer?.tier || 'BRONZE', product.categoryId);

  const lineCalc = computeLineTotals({
    unitPrice: pricing.tierPrice,
    quantity: itemData.quantity,
    discountPct: itemData.discountPct || 0,
    taxRatePct: product.taxRate,
    estimatedCostPerUnit: product.estimatedCost,
  });

  const item = await insertItem({
    quotationId,
    productId: product.id,
    quantity: itemData.quantity,
    unitPrice: pricing.tierPrice,
    allowedDiscountPct,
    discountPct: itemData.discountPct || 0,
    ...lineCalc,
  });

  await recomputeAndPersistTotals(quotationId);
  return getQuotation(quotationId, authUser);
}

export async function updateLineItem(quotationId, itemId, itemData, authUser) {
  const quotation = await lockById(quotationId);
  if (!quotation) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(quotation, authUser);

  if (quotation.status !== 'DRAFT') {
    throw new ConflictError('Line items can only be modified on DRAFT quotations.', 'INVALID_STATE');
  }

  const existingItem = await findItemById(itemId);
  if (!existingItem || existingItem.quotationId !== quotationId) {
    throw new NotFoundError(`Quotation line item '${itemId}' not found.`, 'ITEM_NOT_FOUND');
  }

  const product = await getProduct(existingItem.productId);
  const qty = itemData.quantity !== undefined ? itemData.quantity : existingItem.quantity;
  const discount = itemData.discountPct !== undefined ? itemData.discountPct : Number(existingItem.discountPct);

  const lineCalc = computeLineTotals({
    unitPrice: existingItem.unitPrice,
    quantity: qty,
    discountPct: discount,
    taxRatePct: product.taxRate,
    estimatedCostPerUnit: product.estimatedCost,
  });

  await repoUpdateItem(itemId, {
    quantity: qty,
    discountPct: discount,
    ...lineCalc,
  });

  await recomputeAndPersistTotals(quotationId);
  return getQuotation(quotationId, authUser);
}

export async function removeLineItem(quotationId, itemId, authUser) {
  const quotation = await lockById(quotationId);
  if (!quotation) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(quotation, authUser);

  if (quotation.status !== 'DRAFT') {
    throw new ConflictError('Line items can only be removed from DRAFT quotations.', 'INVALID_STATE');
  }

  const existingItem = await findItemById(itemId);
  if (!existingItem || existingItem.quotationId !== quotationId) {
    throw new NotFoundError(`Quotation line item '${itemId}' not found.`, 'ITEM_NOT_FOUND');
  }

  await repoDeleteItem(itemId);
  await recomputeAndPersistTotals(quotationId);
  return getQuotation(quotationId, authUser);
}

// --- Submit & Self-Governing Risk Check (§3.4) ---

export async function submitQuotation(quotationId, authUser) {
  const quotation = await lockById(quotationId);
  if (!quotation) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(quotation, authUser);

  // Idempotency: If already submitted and resolved
  if (['PENDING_APPROVAL', 'APPROVED'].includes(quotation.status)) {
    return {
      ...(await getQuotation(quotationId, authUser)),
      idempotentReplay: true,
    };
  }

  if (quotation.status !== 'DRAFT') {
    throw new ConflictError('Only DRAFT quotations can be submitted for approval.', 'INVALID_STATE');
  }

  const itemsJoined = await findItemsJoined(quotationId);
  if (itemsJoined.length === 0) {
    throw new ValidationError('Cannot submit a quotation with no line items.');
  }

  // Construct lines for Explainable Risk Engine
  const riskLines = itemsJoined.map((r) => ({
    productId: r.item.productId,
    quantity: r.item.quantity,
    unitPrice: Number(r.item.unitPrice),
    requestedDiscountPct: Number(r.item.discountPct),
  }));

  const riskResult = await evaluateQuoteRisk({
    customerId: quotation.customerId,
    lines: riskLines,
  });

  const requiredLevel = riskResult.summary.requiredApprovalLevel;
  const newStatus = requiredLevel === 'NONE' ? 'APPROVED' : 'PENDING_APPROVAL';

  await applySubmitResult(quotationId, {
    status: newStatus,
    blendedRiskScore: riskResult.summary.blendedRiskScore,
    requiredApprovalLevel: requiredLevel,
  });

  let approvalRequest = null;
  if (newStatus === 'PENDING_APPROVAL') {
    approvalRequest = await createIfRequired(quotationId, riskResult);
  }

  await insertAuditLog({
    actorId: authUser?.id || null,
    entityType: 'QUOTATION',
    entityId: quotationId,
    action: newStatus === 'APPROVED' ? 'AUTO_APPROVED' : 'SUBMITTED_FOR_APPROVAL',
    reason: newStatus === 'APPROVED'
      ? 'Quotation is within authorized delegation limits. Automatically approved.'
      : `Quotation requires ${requiredLevel} approval due to discount overage.`,
    oldValue: { status: 'DRAFT' },
    newValue: {
      status: newStatus,
      blendedRiskScore: riskResult.summary.blendedRiskScore,
      requiredApprovalLevel: requiredLevel,
    },
  });

  const updatedDetail = await getQuotation(quotationId, authUser);

  return {
    ...updatedDetail,
    riskEvaluation: riskResult,
    approvalRequest,
    idempotentReplay: false,
  };
}

// --- Self-service Withdraw (rep pulls a pending quote back to DRAFT) ---

export async function withdrawQuotation(quotationId, authUser) {
  const quotation = await lockById(quotationId);
  if (!quotation) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  assertOwnership(quotation, authUser);

  if (quotation.status !== 'PENDING_APPROVAL') {
    throw new ConflictError('Only PENDING_APPROVAL quotations can be withdrawn to DRAFT.', 'INVALID_STATE');
  }

  const pendingRequest = await getPendingByQuotationId(quotationId);
  if (pendingRequest) {
    await resolveRequest(pendingRequest.id, 'RETURNED');
  }

  await updateHeaderFields(quotationId, {
    status: 'DRAFT',
  });

  await insertAuditLog({
    actorId: authUser?.id || null,
    entityType: 'QUOTATION',
    entityId: quotationId,
    action: 'WITHDRAWN_TO_DRAFT',
    reason: 'Quotation withdrawn to DRAFT for modification.',
    oldValue: { status: 'PENDING_APPROVAL' },
    newValue: { status: 'DRAFT' },
  });

  return getQuotation(quotationId, authUser);
}

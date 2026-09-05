import * as repo from './portalQuotes.repository.js';
import { getDb } from '../../config/database.js';
import { quotations, quotationItems, negotiationRequests, orders, invoices, auditLogs } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../common/errors.js';
import { parseListQuery, buildMeta } from '../../common/pagination.util.js';
import { getProduct } from '../products/products.service.js';
import { resolvePrice } from '../priceLists/priceLists.service.js';
import { resolveAllowedDiscount, evaluateQuoteRisk } from '../risk/risk.service.js';
import { computeLineTotals, computeQuotationTotals } from '../quotations/quotations.calc.js';
import { createIfRequired } from '../approval/approval.service.js';
import { nextQuoteNumber } from '../../common/sequence.util.js';
import * as quotationsRepo from '../quotations/quotations.repository.js';

export function resolveCallerCustomerId(req) {
  if (req.portalAuth?.customerId) return req.portalAuth.customerId;
  if (req.shareTokenAuth?.customerId) return req.shareTokenAuth.customerId;
  throw new ForbiddenError('Customer authentication or share token required.', 'CUSTOMER_AUTH_REQUIRED');
}

export async function listQuotes(portalAuth, query) {
  const { page, limit, offset } = parseListQuery(query);
  const { rows, count } = await repo.listForCustomer(portalAuth.customerId, { offset, limit });
  return {
    items: rows,
    meta: buildMeta(count, page, limit),
  };
}

export async function getQuoteDetail(quotationId, callerCustomerId) {
  const raw = await repo.findRawQuote(quotationId);
  if (!raw || raw.customerId !== callerCustomerId) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  // If internal, must have been shared; if customer self-service, viewable directly.
  if (raw.originType !== 'CUSTOMER_SELF_SERVICE') {
    const isShared = await repo.hasBeenShared(quotationId);
    if (!isShared) {
      throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
    }
  }

  const quote = await repo.findSafeQuote(quotationId);
  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  return quote;
}

export async function createSelfServiceQuote(portalAuth) {
  const customer = await repo.findCustomerWithRep(portalAuth.customerId);
  if (!customer) {
    throw new NotFoundError(`Customer with ID '${portalAuth.customerId}' not found.`, 'CUSTOMER_NOT_FOUND');
  }
  if (!customer.assignedRepId) {
    throw new ConflictError(
      'Your account does not have an assigned sales representative yet. Please contact support before requesting a quote.',
      'NO_ASSIGNED_REP'
    );
  }

  const quoteNumber = await nextQuoteNumber();
  const db = getDb();
  const [quotation] = await db
    .insert(quotations)
    .values({
      quoteNumber,
      customerId: customer.id,
      salesRepId: customer.assignedRepId,
      originType: 'CUSTOMER_SELF_SERVICE',
      createdByCustomerUserId: portalAuth.customerUserId,
      status: 'DRAFT',
    })
    .returning();

  await db.insert(auditLogs).values({
    actorId: null,
    entityType: 'QUOTATION',
    entityId: quotation.id,
    action: 'CUSTOMER_SELF_SERVICE_CREATED',
    reason: 'Customer created a self-service quote request from the portal.',
    newValue: JSON.stringify({ customerUserId: portalAuth.customerUserId, quoteNumber }),
  });

  return quotation;
}

export async function addSelfServiceItem(quotationId, itemData, portalAuth) {
  const quote = await repo.findRawQuote(quotationId);
  if (!quote || quote.customerId !== portalAuth.customerId) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }
  if (quote.originType !== 'CUSTOMER_SELF_SERVICE') {
    throw new ForbiddenError('This quotation was not created by you and cannot be edited here.', 'ACCESS_DENIED');
  }
  if (quote.status !== 'DRAFT') {
    throw new ConflictError('Line items can only be added while the request is still a draft.', 'INVALID_STATE');
  }
  if (!itemData.productId || !itemData.quantity || Number(itemData.quantity) <= 0) {
    throw new ValidationError('productId and a positive quantity are required.');
  }

  const product = await getProduct(itemData.productId);
  if (!product.isActive) {
    throw new ConflictError(`Product '${product.name}' is not currently available.`, 'PRODUCT_INACTIVE');
  }

  const pricing = await resolvePrice({
    customerId: quote.customerId,
    productId: product.id,
    quantity: itemData.quantity,
    requestedDiscountPct: 0,
  });
  const allowedDiscountPct = await resolveAllowedDiscount(portalAuth.tier || 'BRONZE', product.categoryId);

  const lineCalc = computeLineTotals({
    unitPrice: pricing.tierPrice,
    quantity: itemData.quantity,
    discountPct: 0,
    taxRatePct: product.taxRate,
    estimatedCostPerUnit: product.estimatedCost,
  });

  const db = getDb();
  await db.insert(quotationItems).values({
    quotationId,
    productId: product.id,
    quantity: itemData.quantity,
    unitPrice: pricing.tierPrice,
    allowedDiscountPct,
    discountPct: '0',
    ...lineCalc,
  });

  const itemsJoined = await quotationsRepo.findItemsJoined(quotationId);
  const totals = computeQuotationTotals(itemsJoined.map((r) => r.item));
  await quotationsRepo.applyAggregateTotals(quotationId, totals);

  return repo.findSafeQuote(quotationId);
}

export async function submitSelfServiceQuote(quotationId, portalAuth) {
  const quote = await repo.findRawQuote(quotationId);
  if (!quote || quote.customerId !== portalAuth.customerId) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }
  if (quote.originType !== 'CUSTOMER_SELF_SERVICE') {
    throw new ForbiddenError('This quotation was not created by you and cannot be submitted here.', 'ACCESS_DENIED');
  }
  if (quote.status !== 'DRAFT') {
    throw new ConflictError('Only a draft request can be submitted.', 'INVALID_STATE');
  }

  const itemsJoined = await quotationsRepo.findItemsJoined(quotationId);
  if (itemsJoined.length === 0) {
    throw new ValidationError('Add at least one product before submitting your request.');
  }

  const riskLines = itemsJoined.map((r) => ({
    productId: r.item.productId,
    quantity: r.item.quantity,
    unitPrice: Number(r.item.unitPrice),
    requestedDiscountPct: Number(r.item.discountPct),
  }));

  const riskResult = await evaluateQuoteRisk({ customerId: quote.customerId, lines: riskLines });
  const requiredLevel = riskResult.summary.requiredApprovalLevel;

  // A customer-originated quote enters the approval pipeline for human review
  const newStatus = 'PENDING_APPROVAL';
  const effectiveLevel = requiredLevel === 'NONE' ? 'MANAGER' : requiredLevel;

  await quotationsRepo.applySubmitResult(quotationId, {
    status: newStatus,
    blendedRiskScore: riskResult.summary.blendedRiskScore,
    requiredApprovalLevel: effectiveLevel,
  });

  const approvalRequest = await createIfRequired(quotationId, {
    summary: { ...riskResult.summary, requiredApprovalLevel: effectiveLevel },
  });

  await quotationsRepo.insertAuditLog({
    actorId: null,
    entityType: 'QUOTATION',
    entityId: quotationId,
    action: 'CUSTOMER_SELF_SERVICE_SUBMITTED',
    reason: `Customer submitted a self-service quote request (requires ${effectiveLevel} approval).`,
    oldValue: { status: 'DRAFT' },
    newValue: { status: newStatus, blendedRiskScore: riskResult.summary.blendedRiskScore, requiredApprovalLevel: effectiveLevel },
  });

  return {
    quotation: await repo.findSafeQuote(quotationId),
    riskEvaluation: riskResult,
    approvalRequest,
  };
}

export async function confirmQuote(quotationId, portalAuth) {
  const db = getDb();
  const quote = await repo.findRawQuote(quotationId);
  if (!quote || quote.customerId !== portalAuth.customerId) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (quote.status === 'CONFIRMED') {
    const safeQuote = await repo.findSafeQuote(quotationId);
    return { quotation: safeQuote, alreadyConfirmed: true };
  }

  if (quote.status !== 'SENT') {
    throw new ConflictError(
      'Quotation cannot be confirmed right now. Open negotiation requests must be resolved or quotation must be SENT.',
      'NOT_CONFIRMABLE'
    );
  }

  const [openRequest] = await db
    .select()
    .from(negotiationRequests)
    .where(
      and(
        eq(negotiationRequests.quotationId, quotationId),
        eq(negotiationRequests.status, 'OPEN')
      )
    );

  if (openRequest) {
    throw new ConflictError('You have an open negotiation request on this quotation.', 'OPEN_NEGOTIATION');
  }

  const now = new Date();
  await db
    .update(quotations)
    .set({ status: 'CONFIRMED', confirmedAt: now, updatedAt: now })
    .where(eq(quotations.id, quotationId));

  const order = await repo.findOrderForQuotation(quotationId);
  if (order) {
    await db
      .update(orders)
      .set({ confirmedAt: now, updatedAt: now })
      .where(eq(orders.id, order.id));

    const draftInvoice = await repo.findDraftOneTimeInvoice(order.id);
    if (draftInvoice) {
      await db
        .update(invoices)
        .set({ status: 'ISSUED', issuedAt: now, updatedAt: now })
        .where(eq(invoices.id, draftInvoice.id));
    }
  }

  await db.insert(auditLogs).values({
    actorId: null,
    entityType: 'QUOTATION',
    entityId: quotationId,
    action: 'CUSTOMER_CONFIRMED',
    newValue: JSON.stringify({ customerUserId: portalAuth.customerUserId }),
  });

  const updatedQuote = await repo.findSafeQuote(quotationId);
  return { quotation: updatedQuote, alreadyConfirmed: false };
}

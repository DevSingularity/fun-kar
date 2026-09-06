import * as repo from './portalQuotes.repository.js';
import { query, queryOne } from '../../config/database.js';
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

export async function listQuotes(portalAuth, queryParams) {
  const { page, limit, offset } = parseListQuery(queryParams);
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

  const quotation = await queryOne(
    `INSERT INTO quotations (
       quote_number, customer_id, sales_rep_id, origin_type, created_by_customer_user_id, status
     ) VALUES (
       $1, $2, $3, 'CUSTOMER_SELF_SERVICE', $4, 'DRAFT'
     ) RETURNING *`,
    [quoteNumber, customer.id, customer.assignedRepId, portalAuth.customerUserId]
  );

  await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, new_value)
     VALUES (NULL, 'QUOTATION', $1, 'CUSTOMER_SELF_SERVICE_CREATED', 'Customer created a self-service quote request from the portal.', $2)`,
    [quotation.id, JSON.stringify({ customerUserId: portalAuth.customerUserId, quoteNumber })]
  );

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

  await query(
    `INSERT INTO quotation_items (
       quotation_id, product_id, quantity, unit_price, allowed_discount_pct, discount_pct,
       discount_amount, tax_amount, line_total, estimated_cost
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
     )`,
    [
      quotationId,
      product.id,
      itemData.quantity,
      pricing.tierPrice,
      allowedDiscountPct,
      '0',
      lineCalc.discountAmount,
      lineCalc.taxAmount,
      lineCalc.lineTotal,
      lineCalc.estimatedCost,
    ]
  );

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

  const openRequest = await queryOne(
    `SELECT * FROM negotiation_requests
     WHERE quotation_id = $1 AND status = 'OPEN'
     LIMIT 1`,
    [quotationId]
  );

  if (openRequest) {
    throw new ConflictError('You have an open negotiation request on this quotation.', 'OPEN_NEGOTIATION');
  }

  const now = new Date();
  await query(
    `UPDATE quotations
     SET status = 'CONFIRMED', confirmed_at = $2, updated_at = $2
     WHERE id = $1`,
    [quotationId, now]
  );

  const order = await repo.findOrderForQuotation(quotationId);
  if (order) {
    await query(
      `UPDATE orders
       SET confirmed_at = $2, updated_at = $2
       WHERE id = $1`,
      [order.id, now]
    );

    const draftInvoice = await repo.findDraftOneTimeInvoice(order.id);
    if (draftInvoice) {
      await query(
        `UPDATE invoices
         SET status = 'ISSUED', issued_at = $2, updated_at = $2
         WHERE id = $1`,
        [draftInvoice.id, now]
      );
    }
  }

  await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
     VALUES (NULL, 'QUOTATION', $1, 'CUSTOMER_CONFIRMED', $2)`,
    [quotationId, JSON.stringify({ customerUserId: portalAuth.customerUserId })]
  );

  const updatedQuote = await repo.findSafeQuote(quotationId);
  return { quotation: updatedQuote, alreadyConfirmed: false };
}

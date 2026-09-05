import * as repo from './negotiation.repository.js';
import { query, queryOne } from '../../config/database.js';
import { evaluateQuoteRisk } from '../risk/risk.service.js';
import { createIfRequired } from '../approval/approval.service.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';
import { parseListQuery, buildMeta } from '../../common/pagination.util.js';

const NEGOTIABLE_STATUSES = ['SENT', 'UNDER_NEGOTIATION'];

export async function createRequestAsCustomer(quotationId, payload, portalAuth) {
  const quote = await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [quotationId]
  );

  if (!quote || quote.customerId !== portalAuth.customerId) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (!NEGOTIABLE_STATUSES.includes(quote.status)) {
    throw new ConflictError('This quotation cannot be negotiated right now.', 'NOT_NEGOTIABLE');
  }

  let item = null;
  if (payload.quotationItemId) {
    item = await repo.findItemInQuotation(payload.quotationItemId, quotationId);
    if (!item) {
      throw new NotFoundError(`Quotation line item with ID '${payload.quotationItemId}' not found.`, 'ITEM_NOT_FOUND');
    }
  }

  const request = await repo.insertRequest({
    quotationId,
    quotationItemId: payload.quotationItemId || null,
    customerUserId: portalAuth.customerUserId,
    requestType: payload.requestType,
    message: payload.message,
    requestedDiscountPct: payload.requestedDiscountPct !== undefined ? String(payload.requestedDiscountPct) : null,
    status: 'OPEN',
  });

  await repo.insertComment({
    negotiationRequestId: request.id,
    quotationId,
    quotationItemId: payload.quotationItemId || null,
    authorType: 'CUSTOMER',
    authorCustomerUserId: portalAuth.customerUserId,
    message: payload.message,
  });

  const nextStatus = quote.status === 'SENT' ? 'UNDER_NEGOTIATION' : quote.status;
  await query(
    `UPDATE quotations
     SET status = $2, last_activity_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [quotationId, nextStatus]
  );

  return { negotiationRequest: request };
}

export async function addCommentAsCustomer(quotationId, payload, portalAuth) {
  const quote = await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [quotationId]
  );

  if (!quote || quote.customerId !== portalAuth.customerId) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (payload.negotiationRequestId) {
    const reqRow = await repo.findRequestById(payload.negotiationRequestId);
    if (!reqRow || reqRow.quotationId !== quotationId) {
      throw new NotFoundError(`Negotiation request with ID '${payload.negotiationRequestId}' not found.`, 'REQUEST_NOT_FOUND');
    }
  }

  const comment = await repo.insertComment({
    negotiationRequestId: payload.negotiationRequestId || null,
    quotationId,
    quotationItemId: null,
    authorType: 'CUSTOMER',
    authorCustomerUserId: portalAuth.customerUserId,
    message: payload.message,
  });

  await query(
    `UPDATE quotations
     SET last_activity_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [quotationId]
  );

  return { comment };
}

export async function addCommentAsInternal(quotationId, payload, authUser) {
  const quote = await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [quotationId]
  );

  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && quote.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have access to comment on this quotation.', 'ACCESS_DENIED');
  }

  if (payload.negotiationRequestId) {
    const reqRow = await repo.findRequestById(payload.negotiationRequestId);
    if (!reqRow || reqRow.quotationId !== quotationId) {
      throw new NotFoundError(`Negotiation request with ID '${payload.negotiationRequestId}' not found.`, 'REQUEST_NOT_FOUND');
    }
  }

  const comment = await repo.insertComment({
    negotiationRequestId: payload.negotiationRequestId || null,
    quotationId,
    authorType: 'INTERNAL',
    authorUserId: authUser.id,
    message: payload.message,
  });

  return { comment };
}

export async function listRequests(quotationId, queryParams, authUser) {
  const quote = await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [quotationId]
  );

  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && quote.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have access to view negotiation requests for this quotation.', 'ACCESS_DENIED');
  }

  const { page, limit, offset } = parseListQuery(queryParams);
  const { rows, count } = await repo.listRequests(quotationId, { status: queryParams.status, offset, limit });

  return {
    items: rows,
    meta: buildMeta(count, page, limit),
  };
}

export async function getTimeline(quotationId) {
  const { requests, comments } = await repo.timelineRows(quotationId);
  const entries = [
    ...requests.map((r) => ({
      kind: 'REQUEST',
      id: r.id,
      requestType: r.requestType,
      message: r.message,
      requestedDiscountPct: r.requestedDiscountPct ? Number(r.requestedDiscountPct) : null,
      quotationItemId: r.quotationItemId,
      status: r.status,
      createdAt: r.createdAt,
    })),
    ...comments.map((c) => ({
      kind: 'COMMENT',
      id: c.id,
      authorType: c.authorType,
      quotationItemId: c.quotationItemId,
      message: c.message,
      createdAt: c.createdAt,
    })),
  ];

  entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return { timeline: entries };
}

export async function resolveRequest(requestId, { decision, resolutionNote }, authUser) {
  const request = await repo.findRequestById(requestId);

  if (!request) {
    throw new NotFoundError(`Negotiation request with ID '${requestId}' not found.`, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'OPEN') {
    throw new ConflictError('This negotiation request has already been resolved.', 'ALREADY_RESOLVED');
  }

  const quote = await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [request.quotationId]
  );

  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${request.quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && quote.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have permission to resolve negotiation requests for this quotation.', 'ACCESS_DENIED');
  }

  const now = new Date();

  if (decision !== 'ACCEPT' || request.requestType !== 'COUNTER_DISCOUNT') {
    const resolvedStatus = decision === 'ACCEPT' ? 'RESOLVED' : 'REJECTED';
    const updatedRequest = await repo.updateRequest(requestId, {
      status: resolvedStatus,
      resolvedBy: authUser.id,
      resolutionNote,
      resolvedAt: now,
    });

    await repo.insertComment({
      negotiationRequestId: requestId,
      quotationId: quote.id,
      authorType: 'INTERNAL',
      authorUserId: authUser.id,
      message: resolutionNote,
    });

    return {
      negotiationRequest: updatedRequest,
      quotation: quote,
    };
  }

  // Handle ACCEPT with COUNTER_DISCOUNT
  const item = await repo.findItemInQuotation(request.quotationItemId, quote.id);
  if (!item) {
    throw new NotFoundError(`Quotation line item with ID '${request.quotationItemId}' not found.`, 'ITEM_NOT_FOUND');
  }

  const newDiscountPct = Number(request.requestedDiscountPct || 0);
  const unitPrice = Number(item.unitPrice);
  const quantity = Number(item.quantity);
  const effectiveUnitPrice = unitPrice * (1 - newDiscountPct / 100);
  const lineTotal = Number((effectiveUnitPrice * quantity).toFixed(2));
  const discountAmount = Number(((unitPrice * newDiscountPct / 100) * quantity).toFixed(2));

  await query(
    `UPDATE quotation_items
     SET discount_pct = $2, discount_amount = $3, line_total = $4, updated_at = $5
     WHERE id = $1`,
    [item.id, String(newDiscountPct), String(discountAmount), String(lineTotal), now]
  );

  // Recalculate quotation totals
  const allItems = await query(
    `SELECT * FROM quotation_items WHERE quotation_id = $1`,
    [quote.id]
  );

  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  for (const it of allItems) {
    const uPrice = Number(it.unitPrice);
    const qty = Number(it.quantity);
    const dPct = Number(it.discountPct);
    const tAmount = Number(it.taxAmount || 0);
    subtotal += uPrice * qty;
    discountTotal += (uPrice * dPct / 100) * qty;
    taxTotal += tAmount;
  }

  const grandTotal = Number((subtotal - discountTotal + taxTotal).toFixed(2));

  await query(
    `UPDATE quotations
     SET subtotal = $2, discount_total = $3, tax_total = $4, grand_total = $5,
         last_activity_at = $6, updated_at = $6
     WHERE id = $1`,
    [
      quote.id,
      String(subtotal.toFixed(2)),
      String(discountTotal.toFixed(2)),
      String(taxTotal.toFixed(2)),
      String(grandTotal.toFixed(2)),
      now,
    ]
  );

  // Risk evaluation & automatic re-approval routing trigger
  const riskPayload = {
    customerId: quote.customerId,
    lines: allItems.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      requestedDiscountPct: Number(it.discountPct),
    })),
  };

  const riskResult = await evaluateQuoteRisk(riskPayload);

  let updatedQuoteStatus = 'SENT';
  let approvalReqId = null;

  if (riskResult.summary.requiredApprovalLevel !== 'NONE') {
    updatedQuoteStatus = 'PENDING_APPROVAL';

    const createdApproval = await createIfRequired(quote.id, riskResult);
    approvalReqId = createdApproval?.id;

    await query(
      `UPDATE quotations
       SET status = 'PENDING_APPROVAL',
           required_approval_level = $2,
           blended_risk_score = $3,
           updated_at = $4
       WHERE id = $1`,
      [quote.id, riskResult.summary.requiredApprovalLevel, String(riskResult.summary.blendedRiskScore), now]
    );
  } else {
    await query(
      `UPDATE quotations
       SET status = 'SENT',
           required_approval_level = 'NONE',
           blended_risk_score = $2,
           updated_at = $3
       WHERE id = $1`,
      [quote.id, String(riskResult.summary.blendedRiskScore), now]
    );
  }

  const updatedRequest = await repo.updateRequest(requestId, {
    status: 'RESOLVED',
    resolvedBy: authUser.id,
    resolutionNote,
    resolvedAt: now,
  });

  await repo.insertComment({
    negotiationRequestId: requestId,
    quotationId: quote.id,
    authorType: 'INTERNAL',
    authorUserId: authUser.id,
    message: resolutionNote,
  });

  await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, reason, old_value, new_value)
     VALUES ($1, 'QUOTATION_ITEM', $2, 'DISCOUNT_RENEGOTIATED', $3, $4, $5)`,
    [
      authUser.id,
      item.id,
      resolutionNote,
      JSON.stringify({ discountPct: item.discountPct }),
      JSON.stringify({
        discountPct: newDiscountPct,
        blendedRiskScore: riskResult.summary.blendedRiskScore,
        requiredApprovalLevel: riskResult.summary.requiredApprovalLevel,
        status: updatedQuoteStatus,
      }),
    ]
  );

  const finalQuote = await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [quote.id]
  );

  return {
    negotiationRequest: updatedRequest,
    quotation: finalQuote,
    riskResult,
    reenteredApproval: updatedQuoteStatus === 'PENDING_APPROVAL',
    approvalRequestId: approvalReqId,
  };
}

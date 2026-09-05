import * as repo from './negotiation.repository.js';
import { getDb } from '../../config/database.js';
import { quotations, quotationItems, approvalRequests, auditLogs } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { evaluateQuoteRisk } from '../risk/risk.service.js';
import { createIfRequired } from '../approval/approval.service.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';

import { parseListQuery, buildMeta } from '../../common/pagination.util.js';


const NEGOTIABLE_STATUSES = ['SENT', 'UNDER_NEGOTIATION'];

export async function createRequestAsCustomer(quotationId, payload, portalAuth) {
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId));


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
  await db
    .update(quotations)
    .set({ status: nextStatus, lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(quotations.id, quotationId));

  return { negotiationRequest: request };
}

export async function addCommentAsCustomer(quotationId, payload, portalAuth) {
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId));

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

  await db
    .update(quotations)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(quotations.id, quotationId));

  return { comment };
}

export async function addCommentAsInternal(quotationId, payload, authUser) {
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId));

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

export async function listRequests(quotationId, query, authUser) {
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId));

  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && quote.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have access to view negotiation requests for this quotation.', 'ACCESS_DENIED');
  }

  const { page, limit, offset } = parseListQuery(query);
  const { rows, count } = await repo.listRequests(quotationId, { status: query.status, offset, limit });

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
  const db = getDb();
  const request = await repo.findRequestById(requestId);

  if (!request) {
    throw new NotFoundError(`Negotiation request with ID '${requestId}' not found.`, 'REQUEST_NOT_FOUND');
  }

  if (request.status !== 'OPEN') {
    throw new ConflictError('This negotiation request has already been resolved.', 'ALREADY_RESOLVED');
  }

  const [quote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, request.quotationId));

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

  await db
    .update(quotationItems)
    .set({
      discountPct: String(newDiscountPct),
      discountAmount: String(discountAmount),
      lineTotal: String(lineTotal),
      updatedAt: now,
    })
    .where(eq(quotationItems.id, item.id));

  // Recalculate quotation totals
  const allItems = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, quote.id));

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

  await db
    .update(quotations)
    .set({
      subtotal: String(subtotal.toFixed(2)),
      discountTotal: String(discountTotal.toFixed(2)),
      taxTotal: String(taxTotal.toFixed(2)),
      grandTotal: String(grandTotal.toFixed(2)),
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(quotations.id, quote.id));

  // Risk evaluation & automatic re-approval routing trigger!
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
    // Exceeds thresholds -> Automatically re-enter approval stage!
    updatedQuoteStatus = 'PENDING_APPROVAL';

    // Create approval request entry
    const createdApproval = await createIfRequired(quote.id, riskResult);
    approvalReqId = createdApproval?.id;

    await db
      .update(quotations)
      .set({
        status: 'PENDING_APPROVAL',
        requiredApprovalLevel: riskResult.summary.requiredApprovalLevel,
        blendedRiskScore: String(riskResult.summary.blendedRiskScore),
        updatedAt: now,
      })
      .where(eq(quotations.id, quote.id));
  } else {

    await db
      .update(quotations)
      .set({
        status: 'SENT',
        requiredApprovalLevel: 'NONE',
        blendedRiskScore: String(riskResult.summary.blendedRiskScore),
        updatedAt: now,
      })
      .where(eq(quotations.id, quote.id));
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

  await db.insert(auditLogs).values({
    actorId: authUser.id,
    entityType: 'QUOTATION_ITEM',
    entityId: item.id,
    action: 'DISCOUNT_RENEGOTIATED',
    reason: resolutionNote,
    oldValue: JSON.stringify({ discountPct: item.discountPct }),
    newValue: JSON.stringify({
      discountPct: newDiscountPct,
      blendedRiskScore: riskResult.summary.blendedRiskScore,
      requiredApprovalLevel: riskResult.summary.requiredApprovalLevel,
      status: updatedQuoteStatus,
    }),
  });

  const [finalQuote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quote.id));

  return {
    negotiationRequest: updatedRequest,
    quotation: finalQuote,
    riskResult,
    reenteredApproval: updatedQuoteStatus === 'PENDING_APPROVAL',
    approvalRequestId: approvalReqId,
  };
}

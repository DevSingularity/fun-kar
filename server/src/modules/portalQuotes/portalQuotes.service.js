import * as repo from './portalQuotes.repository.js';
import { getDb } from '../../config/database.js';
import { quotations, negotiationRequests, orders, invoices, auditLogs } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';
import { parseListQuery, buildMeta } from '../../common/pagination.util.js';

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
  const isShared = await repo.hasBeenShared(quotationId);
  if (!isShared) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  const quote = await repo.findSafeQuote(quotationId);
  if (!quote || quote.customerId !== callerCustomerId) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  return quote;
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

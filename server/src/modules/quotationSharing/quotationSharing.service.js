import { getDb } from '../../config/database.js';
import { quotations, quotationPortalTokens, approvalRequests, auditLogs } from '../../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { generateRawToken, hashToken } from '../../common/portalToken.util.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';
import { env } from '../../config/env.js';

const SHARE_TOKEN_TTL_DAYS = 14;

export async function shareQuotation(quotationId, authUser) {
  const db = getDb();
  const [quote] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId));


  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && quote.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have access to share this quotation.', 'ACCESS_DENIED');
  }

  // Precondition check: No pending approval request
  const [pendingApproval] = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.quotationId, quotationId),
        eq(approvalRequests.status, 'PENDING')
      )
    );

  if (pendingApproval) {
    throw new ConflictError('Quotation is currently pending internal approval.', 'APPROVAL_PENDING');
  }

  // Revoke existing active share tokens for this quotation
  await db
    .update(quotationPortalTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(quotationPortalTokens.quotationId, quotationId),
        isNull(quotationPortalTokens.revokedAt)
      )
    );

  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + SHARE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const [tokenRow] = await db
    .insert(quotationPortalTokens)
    .values({
      quotationId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    })
    .returning();

  const nonRegressableStatuses = ['SENT', 'UNDER_NEGOTIATION', 'CONFIRMED', 'FULFILLING', 'COMPLETED'];
  if (!nonRegressableStatuses.includes(quote.status)) {
    await db
      .update(quotations)
      .set({ status: 'SENT', lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(quotations.id, quotationId));
  }

  // Audit log entry
  await db.insert(auditLogs).values({
    actorId: authUser.id,
    entityType: 'QUOTATION',
    entityId: quotationId,
    action: 'PORTAL_SHARED',
    newValue: JSON.stringify({ tokenId: tokenRow.id, expiresAt: tokenRow.expiresAt }),
  });

  const baseUrl = env.PORTAL_BASE_URL || 'http://localhost:5173';
  return {
    shareUrl: `${baseUrl}/v1/customer?token=${rawToken}`,
    rawToken,
    expiresAt: tokenRow.expiresAt,
  };
}

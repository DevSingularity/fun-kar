import { query, queryOne } from '../../config/database.js';
import { generateRawToken, hashToken } from '../../common/portalToken.util.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';
import { env } from '../../config/env.js';

const SHARE_TOKEN_TTL_DAYS = 14;

export async function shareQuotation(quotationId, authUser) {
  const quote = await queryOne(
    `SELECT * FROM quotations WHERE id = $1`,
    [quotationId]
  );

  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && quote.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have access to share this quotation.', 'ACCESS_DENIED');
  }

  // Precondition check: No pending approval request
  const pendingApproval = await queryOne(
    `SELECT * FROM approval_requests
     WHERE quotation_id = $1 AND status = 'PENDING'
     LIMIT 1`,
    [quotationId]
  );

  if (pendingApproval) {
    throw new ConflictError('Quotation is currently pending internal approval.', 'APPROVAL_PENDING');
  }

  // Revoke existing active share tokens for this quotation
  await query(
    `UPDATE quotation_portal_tokens
     SET revoked_at = NOW()
     WHERE quotation_id = $1 AND revoked_at IS NULL`,
    [quotationId]
  );

  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + SHARE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const tokenRow = await queryOne(
    `INSERT INTO quotation_portal_tokens (quotation_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [quotationId, hashToken(rawToken), expiresAt]
  );

  const nonRegressableStatuses = ['SENT', 'UNDER_NEGOTIATION', 'CONFIRMED', 'FULFILLING', 'COMPLETED'];
  if (!nonRegressableStatuses.includes(quote.status)) {
    await query(
      `UPDATE quotations
       SET status = 'SENT', last_activity_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [quotationId]
    );
  }

  // Audit log entry
  await query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, new_value)
     VALUES ($1, 'QUOTATION', $2, 'PORTAL_SHARED', $3)`,
    [
      authUser.id,
      quotationId,
      JSON.stringify({ tokenId: tokenRow.id, expiresAt: tokenRow.expiresAt }),
    ]
  );

  const baseUrl = env.PORTAL_BASE_URL || 'http://localhost:5173';
  return {
    shareUrl: `${baseUrl}/v1/customer?token=${rawToken}`,
    rawToken,
    expiresAt: tokenRow.expiresAt,
  };
}

import { verifyToken } from '../common/jwt.util.js';
import { UnauthenticatedError, ForbiddenError } from '../common/errors.js';
import { hashToken } from '../common/portalToken.util.js';
import { getDb } from '../config/database.js';
import { quotationPortalTokens, quotations } from '../db/schema/index.js';
import { eq, and, isNull, gt } from 'drizzle-orm';

export function authenticatePortal(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token && req.cookies?.portalToken) {
    token = req.cookies.portalToken;
  }

  if (!token) {
    return next(new UnauthenticatedError('Portal authentication required. Missing Bearer token.', 'PORTAL_AUTH_REQUIRED'));
  }

  try {
    const decoded = verifyToken(token, 'customer_portal');
    if (decoded.role || decoded.scope === 'access' || decoded.type === 'access') {
      return next(new ForbiddenError('RBAC Violation: Internal staff tokens (ADMIN, SALES_REP, etc.) cannot access Customer Portal APIs.', 'RBAC_DENIED'));
    }

    req.portalAuth = {
      customerUserId: decoded.sub || decoded.customerUserId,
      customerId: decoded.customerId,
    };
    next();
  } catch (err) {
    next(err);
  }
}


export async function attachShareTokenIfPresent(req, res, next) {
  const rawToken = req.headers['x-quote-token'];
  if (!rawToken || !req.params.id) {
    return next();
  }

  try {
    const db = getDb();
    const tokenHash = hashToken(rawToken);
    const [tokenRow] = await db
      .select()
      .from(quotationPortalTokens)
      .where(
        and(
          eq(quotationPortalTokens.quotationId, req.params.id),
          eq(quotationPortalTokens.tokenHash, tokenHash),
          isNull(quotationPortalTokens.revokedAt),
          gt(quotationPortalTokens.expiresAt, new Date())
        )
      );

    if (tokenRow) {
      const [quoteRow] = await db
        .select({ customerId: quotations.customerId })
        .from(quotations)
        .where(eq(quotations.id, req.params.id));

      if (quoteRow) {
        req.shareTokenAuth = {
          customerId: quoteRow.customerId,
          tokenOnly: true,
        };
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}


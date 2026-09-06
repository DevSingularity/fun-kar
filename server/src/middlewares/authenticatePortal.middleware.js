import { verifyToken } from '../common/jwt.util.js';
import { UnauthenticatedError, ForbiddenError } from '../common/errors.js';
import { hashToken } from '../common/portalToken.util.js';
import { queryOne } from '../config/database.js';

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
    const tokenHash = hashToken(rawToken);
    const tokenRow = await queryOne(
      `SELECT * FROM quotation_portal_tokens
       WHERE quotation_id = $1
         AND token_hash = $2
         AND revoked_at IS NULL
         AND expires_at > NOW()`,
      [req.params.id, tokenHash]
    );

    if (tokenRow) {
      const quoteRow = await queryOne(
        `SELECT customer_id FROM quotations WHERE id = $1`,
        [req.params.id]
      );

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

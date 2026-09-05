import { verifyToken } from '../common/jwt.util.js';
import { UnauthenticatedError, ForbiddenError } from '../common/errors.js';

export function authenticate(req, res, next) {
  let token = null;

  // 1. Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Cookie fallback
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return next(new UnauthenticatedError('Authentication required. Missing Bearer token.'));
  }

  try {
    const decoded = verifyToken(token, 'access');
    if (decoded.scope === 'customer_portal' || decoded.type === 'customer_portal') {
      return next(new ForbiddenError('RBAC Violation: Customer portal tokens cannot access internal staff APIs.', 'RBAC_DENIED'));
    }

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (err) {
    next(err);
  }
}


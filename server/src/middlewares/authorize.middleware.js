import { ForbiddenError, UnauthenticatedError } from '../common/errors.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthenticatedError('User is not authenticated.'));
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden. Role '${req.user.role}' lacks required permissions [${allowedRoles.join(', ')}].`
        )
      );
    }

    next();
  };
}

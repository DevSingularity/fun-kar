import { AppError } from '../common/errors.js';
import { errorResponse } from '../common/response.util.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  // 1. Known typed AppError
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.code, err.details);
  }

  // 2. Postgres unique violation (code 23505)
  if (err.code === '23505') {
    return errorResponse(
      res,
      'A record with matching unique values already exists.',
      409,
      'CONFLICT',
      err.detail
    );
  }

  // 3. Postgres foreign key violation (code 23503)
  if (err.code === '23503') {
    return errorResponse(
      res,
      'Referenced entity does not exist or cannot be deleted.',
      400,
      'FOREIGN_KEY_VIOLATION',
      err.detail
    );
  }

  // 4. JSON parse error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Malformed JSON in request body.', 400, 'INVALID_JSON');
  }

  // 5. Unhandled internal server error
  console.error('[UNHANDLED_ERROR]', err);
  const message = env.isProduction ? 'Internal server error.' : err.message;
  return errorResponse(
    res,
    message,
    500,
    'INTERNAL_SERVER_ERROR',
    env.isDevelopment ? { stack: err.stack } : undefined
  );
}

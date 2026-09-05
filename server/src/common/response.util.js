/**
 * Standard API Response Envelope
 */

export function successResponse(res, data, statusCode = 200, meta = undefined) {
  const payload = {
    success: true,
    data,
  };
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
}

export function errorResponse(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
  const payload = {
    success: false,
    error: {
      code,
      message,
    },
  };
  if (details !== undefined) {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
}

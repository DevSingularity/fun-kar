/**
 * Global error handler
 * Catches anything passed to next(error) and formats a consistent JSON response.
 */
export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error.';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.url} →`, err);
  }

  return res.status(statusCode).json({ message });
}

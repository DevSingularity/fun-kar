/**
 * Minimal logger wrapper.
 * In production swap this for a proper logger like pino or winston.
 */
export const logger = {
  info:  (...args) => console.log('[INFO]',  ...args),
  warn:  (...args) => console.warn('[WARN]',  ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => process.env.NODE_ENV !== 'production' && console.log('[DEBUG]', ...args),
};

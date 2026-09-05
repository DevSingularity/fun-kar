import rateLimit from 'express-rate-limit';
import { errorResponse } from '../common/response.util.js';

export function buildLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return errorResponse(res, message, 429, 'TOO_MANY_REQUESTS');
    },
  });
}

export const authLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const apiLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'Rate limit exceeded. Please throttle your requests.',
});

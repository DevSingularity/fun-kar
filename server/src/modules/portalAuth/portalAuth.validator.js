import { ValidationError } from '../../common/errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateMagicLinkRequest(req, res, next) {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return next(new ValidationError('A valid email address is required.', [{ field: 'email', message: 'A valid email address is required.' }]));
  }
  req.body.email = email.trim().toLowerCase();
  next();
}

export function validateMagicLinkConsume(req, res, next) {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return next(new ValidationError('Token is required.', [{ field: 'token', message: 'Token is required.' }]));
  }
  req.body.token = token.trim();
  next();
}

export function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push({ field: 'password', message: 'Password is required.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for portal login input.', errors));
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

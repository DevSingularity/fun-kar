import { ValidationError } from '../../common/errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCreatePortalUser(req, res, next) {
  const { name, email } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required (max 150 characters).' });
  } else if (name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Name cannot exceed 150 characters.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for customer portal contact input.', errors));
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
}

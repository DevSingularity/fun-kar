import { ValidationError } from '../../common/errors.js';

export function validateCreateCategory(req, res, next) {
  const { name } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Category name is required (1-100 characters).' });
  } else if (name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Category name cannot exceed 100 characters.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for category creation.', errors));
  }
  next();
}

export function validateUpdateCategory(req, res, next) {
  const { name } = req.body || {};
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Category name cannot be empty.' });
    } else if (name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Category name cannot exceed 100 characters.' });
    }
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for category update.', errors));
  }
  next();
}

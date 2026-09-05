import { ValidationError } from '../../common/errors.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(req, res, next) {
  const { name, email, password, confirmPassword } = req.body || {};
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required (1-150 characters).' });
  } else if (name.trim().length > 150) {
    errors.push({ field: 'name', message: 'Name cannot exceed 150 characters.' });
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'A valid email address is required.' });
  } else if (email.trim().length > 255) {
    errors.push({ field: 'email', message: 'Email cannot exceed 255 characters.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long.' });
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one letter and one number.' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for registration input.', errors));
  }

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
    return next(new ValidationError('Validation failed for login input.', errors));
  }

  next();
}

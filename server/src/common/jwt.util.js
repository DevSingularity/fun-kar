import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthenticatedError } from './errors.js';

export function signAccessToken(payload) {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

export function signRefreshToken(payload) {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );
}

export function buildTokenPair(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export function signPortalToken(payload) {
  return jwt.sign(
    { ...payload, type: 'customer_portal' },
    env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

export function verifyToken(token, expectedType = 'access') {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (expectedType && decoded.type !== expectedType) {
      throw new UnauthenticatedError(`Invalid token type. Expected ${expectedType}`, 'INVALID_TOKEN_TYPE');
    }
    return decoded;
  } catch (err) {
    if (err instanceof UnauthenticatedError) throw err;
    if (err.name === 'TokenExpiredError') {
      throw new UnauthenticatedError('Token has expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthenticatedError('Invalid token', 'INVALID_TOKEN');
  }
}


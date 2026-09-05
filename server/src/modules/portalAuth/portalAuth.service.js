import * as repo from './portalAuth.repository.js';
import { generateRawToken, hashToken } from '../../common/portalToken.util.js';
import { signPortalToken } from '../../common/jwt.util.js';
import { UnauthenticatedError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import bcrypt from 'bcrypt';

const MAGIC_LINK_TTL_MINUTES = 30;

export async function requestMagicLink(email) {
  const user = await repo.findActiveByEmail(email);
  if (!user) {
    return { sent: true };
  }

  const raw = generateRawToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);
  await repo.insertToken({
    customerUserId: user.id,
    tokenHash: hashToken(raw),
    expiresAt,
  });

  const result = { sent: true };
  if (env.NODE_ENV !== 'production') {
    result.devMagicLink = raw;
  }
  return result;
}

export function issueSession(customerUser) {
  const token = signPortalToken({
    sub: customerUser.id,
    customerUserId: customerUser.id,
    customerId: customerUser.customerId,
    email: customerUser.email,
  });

  return {
    token,
    customerUser: {
      id: customerUser.id,
      name: customerUser.name,
      email: customerUser.email,
      customerId: customerUser.customerId,
    },
  };
}

export async function consumeMagicLink(rawToken) {
  const tokenHash = hashToken(rawToken);
  const row = await repo.findValidToken(tokenHash);
  if (!row) {
    throw new UnauthenticatedError('Magic link is invalid or has expired.', 'INVALID_MAGIC_LINK');
  }

  await repo.markTokenUsed(row.id);
  const user = await repo.findById(row.customerUserId);
  if (!user || !user.isActive) {
    throw new UnauthenticatedError('Customer user account is inactive or disabled.', 'ACCOUNT_DISABLED');
  }
  return issueSession(user);
}

export async function login({ email, password }) {
  const user = await repo.findActiveByEmail(email);
  if (!user || !user.passwordHash) {
    throw new UnauthenticatedError('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new UnauthenticatedError('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const fullUser = await repo.findById(user.id);
  return issueSession(fullUser);
}

export async function me(customerUserId) {
  const user = await repo.findById(customerUserId);
  if (!user) {
    throw new UnauthenticatedError('Portal session is no longer valid.', 'SESSION_INVALID');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    customer: {
      id: user.customerId,
      name: user.customerName,
      tier: user.customerTier,
    },
  };
}

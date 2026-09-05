import { transaction } from '../../config/database.js';
import { env } from '../../config/env.js';
import { hashPassword, comparePassword } from '../../common/password.util.js';
import { buildTokenPair, verifyToken } from '../../common/jwt.util.js';
import {
  ConflictError,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors.js';
import { findUserByEmail, findUserById, createUser } from './auth.repository.js';
import { recordAuditTrail } from '../audit/audit.service.js';

export async function registerUser({ name, email, password }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ConflictError(`Email address '${email}' is already registered.`, 'EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(password);

  // Execute user creation and initial audit log in transaction
  const user = await transaction(async (tx) => {
    const newUser = await createUser(
      {
        name,
        email,
        passwordHash,
        role: 'SALES_REP', // Self-signup is always restricted to SALES_REP
      },
      tx
    );

    await recordAuditTrail(
      {
        actorId: newUser.id,
        entityType: 'USER',
        entityId: newUser.id,
        action: 'USER_REGISTERED',
        newValue: { name: newUser.name, email: newUser.email, role: newUser.role },
      },
      tx
    );

    return newUser;
  });

  const tokens = buildTokenPair(user);
  return {
    user,
    ...tokens,
  };
}

export async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new UnauthenticatedError('Invalid email or password credentials.', 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new ForbiddenError('This user account has been disabled. Contact an administrator.', 'ACCOUNT_DISABLED');
  }

  const passwordValid = await comparePassword(password, user.passwordHash);
  if (!passwordValid) {
    throw new UnauthenticatedError('Invalid email or password credentials.', 'INVALID_CREDENTIALS');
  }

  const userSafe = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  const tokens = buildTokenPair(userSafe);
  return {
    user: userSafe,
    ...tokens,
  };
}

export async function refreshUserToken(refreshToken) {
  if (!refreshToken) {
    throw new UnauthenticatedError('Refresh token required.', 'MISSING_REFRESH_TOKEN');
  }

  const decoded = verifyToken(refreshToken, 'refresh');
  const user = await findUserById(decoded.userId);

  if (!user) {
    throw new NotFoundError('User associated with token not found.', 'USER_NOT_FOUND');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Account is disabled.', 'ACCOUNT_DISABLED');
  }

  const tokens = buildTokenPair(user);
  return {
    user,
    ...tokens,
  };
}

export async function getCurrentUserProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new NotFoundError('User profile not found.', 'USER_NOT_FOUND');
  }
  return user;
}

export function listDemoAccounts() {
  if (!env.ENABLE_DEMO_ACCOUNTS) {
    return [];
  }
  return env.DEMO_ACCOUNTS;
}

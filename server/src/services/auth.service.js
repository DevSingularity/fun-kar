/**
 * Auth Service
 *
 * Handles registration, login, session refresh, and logout using:
 *  - bcrypt      → password hashing
 *  - JWT         → stateless access tokens (15 min) + refresh tokens (7 days)
 *  - Drizzle/PG  → user persistence
 *
 * Token strategy:
 *  - Access token  → short-lived, sent in Authorization header
 *  - Refresh token → long-lived, stored as HttpOnly cookie + hashed in DB
 *  - On each refresh → refresh token is rotated (old hash invalidated)
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

import { getDb } from '../db/index.js';
import { users } from '../db/schema/index.js';

// ── Config ────────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  const secret = requireJwtSecret();
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      type: 'access',
    },
    secret,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

function signRefreshToken(user) {
  const secret = requireJwtSecret();
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    secret,
    { expiresIn: REFRESH_TOKEN_TTL },
  );
}

/**
 * Build the standardised auth response payload.
 * NOTE: Never include passwordHash or refreshTokenHash here.
 */
function buildAuthPayload(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    },
    accessToken,
    refreshToken,
  };
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * Register a new user.
 * TODO: Rename "name" field to match your entity (e.g. orgName, teamName).
 */
export async function registerUser(payload = {}) {
  const db = getDb();
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';

  // Check for existing user
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  if (existing) {
    const error = new Error('An account with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash })
    .returning();

  const authPayload = buildAuthPayload(user);

  await db
    .update(users)
    .set({ refreshTokenHash: hashToken(authPayload.refreshToken), lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  return authPayload;
}

/**
 * Login with email + password.
 */
export async function loginUser(payload = {}) {
  const db = getDb();
  const email = normalizeEmail(payload.email);
  const password = typeof payload.password === 'string' ? payload.password : '';

  const [user] = await db.select().from(users).where(eq(users.email, email));

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const authPayload = buildAuthPayload(user);

  await db
    .update(users)
    .set({ refreshTokenHash: hashToken(authPayload.refreshToken), lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  return authPayload;
}

/**
 * Rotate refresh token → issue new access + refresh pair.
 */
export async function refreshUserSession(refreshToken) {
  const secret = requireJwtSecret();
  const db = getDb();

  if (!refreshToken) {
    const error = new Error('Refresh token is required.');
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, secret);
  } catch {
    const error = new Error('Refresh session is invalid or expired.');
    error.statusCode = 401;
    throw error;
  }

  if (decoded.type !== 'refresh') {
    const error = new Error('Invalid refresh token type.');
    error.statusCode = 401;
    throw error;
  }

  const [user] = await db.select().from(users).where(eq(users.id, decoded.userId));

  if (!user || !user.refreshTokenHash) {
    const error = new Error('Refresh session not found.');
    error.statusCode = 401;
    throw error;
  }

  if (user.refreshTokenHash !== hashToken(refreshToken)) {
    const error = new Error('Refresh session was rotated or revoked.');
    error.statusCode = 401;
    throw error;
  }

  const authPayload = buildAuthPayload(user);

  await db
    .update(users)
    .set({ refreshTokenHash: hashToken(authPayload.refreshToken) })
    .where(eq(users.id, user.id));

  return authPayload;
}

/**
 * Logout — invalidates the stored refresh token hash.
 */
export async function logoutUser(refreshToken) {
  const secret = requireJwtSecret();
  const db = getDb();

  if (!refreshToken) return;

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, secret);
  } catch {
    return; // expired/invalid — nothing to revoke
  }

  if (!decoded?.userId) return;

  await db
    .update(users)
    .set({ refreshTokenHash: null })
    .where(eq(users.id, decoded.userId));
}

/**
 * Fetch a user by ID (no sensitive fields).
 */
export async function getUserById(userId) {
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      plan: users.plan,
      notifyOnHighPriority: users.notifyOnHighPriority,
      notifyDigest: users.notifyDigest,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  return user ?? null;
}

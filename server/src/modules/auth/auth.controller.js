import { successResponse } from '../../common/response.util.js';
import {
  registerUser,
  loginUser,
  refreshUserToken,
  getCurrentUserProfile,
  listDemoAccounts,
} from './auth.service.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function handleRegister(req, res) {
  const result = await registerUser(req.body);
  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
  return successResponse(res, result, 201);
}

export async function handleLogin(req, res) {
  const result = await loginUser(req.body);
  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
  return successResponse(res, result, 200);
}

export async function handleRefresh(req, res) {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const result = await refreshUserToken(token);
  res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
  return successResponse(res, result, 200);
}

export async function handleLogout(req, res) {
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
  return successResponse(res, { loggedOut: true }, 200);
}

export async function handleGetMe(req, res) {
  const user = await getCurrentUserProfile(req.user.id);
  return successResponse(res, { user }, 200);
}

export async function handleGetDemoAccounts(req, res) {
  const accounts = listDemoAccounts();
  return successResponse(res, { accounts }, 200);
}

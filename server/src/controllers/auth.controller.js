import { loginUser, logoutUser, refreshUserSession, registerUser, getUserById } from '../services/auth.service.js';

const REFRESH_COOKIE = 'app_refresh_token'; // TODO: rename to match your app
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' };

function sendAuthResponse(res, statusCode, authPayload) {
  res.cookie(REFRESH_COOKIE, authPayload.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return res.status(statusCode).json({
    message: statusCode === 201 ? 'Registered successfully.' : 'Login successful.',
    user: authPayload.user,
    accessToken: authPayload.accessToken,
  });
}

export async function registerController(req, res, next) {
  try { return sendAuthResponse(res, 201, await registerUser(req.body)); } catch (e) { return next(e); }
}
export async function loginController(req, res, next) {
  try { return sendAuthResponse(res, 200, await loginUser(req.body)); } catch (e) { return next(e); }
}
export async function refreshController(req, res, next) {
  try { return sendAuthResponse(res, 200, await refreshUserSession(req.cookies?.[REFRESH_COOKIE])); } catch (e) { return next(e); }
}
export async function logoutController(req, res, next) {
  try {
    await logoutUser(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (e) { return next(e); }
}
export async function getMeController(req, res, next) {
  try {
    const user = await getUserById(req.auth.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    return res.status(200).json({ user });
  } catch (e) { return next(e); }
}

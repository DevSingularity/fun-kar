import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authLimiter } from '../../middlewares/rateLimiter.middleware.js';
import { validateRegister, validateLogin } from './auth.validator.js';
import {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
  handleGetMe,
  handleGetDemoAccounts,
} from './auth.controller.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, validateRegister, asyncHandler(handleRegister));
router.post('/login', authLimiter, validateLogin, asyncHandler(handleLogin));
router.post('/refresh', asyncHandler(handleRefresh));
router.post('/logout', asyncHandler(handleLogout));
router.get('/demo-accounts', asyncHandler(handleGetDemoAccounts));

// Protected routes
router.get('/me', authenticate, asyncHandler(handleGetMe));

export default router;

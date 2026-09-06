import { Router } from 'express';
import * as ctrl from './portalAuth.controller.js';
import { validateMagicLinkRequest, validateMagicLinkConsume, validateLogin } from './portalAuth.validator.js';
import { authenticatePortal } from '../../middlewares/authenticatePortal.middleware.js';
import { authLimiter } from '../../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/magic-link', authLimiter, validateMagicLinkRequest, ctrl.requestMagicLink);
router.post('/magic-link/consume', authLimiter, validateMagicLinkConsume, ctrl.consumeMagicLink);
router.post('/login', authLimiter, validateLogin, ctrl.login);
router.get('/me', authenticatePortal, ctrl.me);

export default router;

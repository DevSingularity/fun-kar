import { Router } from 'express';
import * as ctrl from './portalAuth.controller.js';
import { validateMagicLinkRequest, validateMagicLinkConsume, validateLogin } from './portalAuth.validator.js';
import { authenticatePortal } from '../../middlewares/authenticatePortal.middleware.js';

const router = Router();

router.post('/magic-link', validateMagicLinkRequest, ctrl.requestMagicLink);
router.post('/magic-link/consume', validateMagicLinkConsume, ctrl.consumeMagicLink);
router.post('/login', validateLogin, ctrl.login);
router.get('/me', authenticatePortal, ctrl.me);

export default router;

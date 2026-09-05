import { Router } from 'express';
import * as ctrl from './portalQuotes.controller.js';
import * as portalCtrl from '../negotiation/negotiation.portal.controller.js';
import { authenticatePortal, attachShareTokenIfPresent } from '../../middlewares/authenticatePortal.middleware.js';
import { validateCreateRequest, validateComment } from '../negotiation/negotiation.validator.js';
import { UnauthenticatedError } from '../../common/errors.js';

function optionalPortalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticatePortal(req, res, next);
  }
  return attachShareTokenIfPresent(req, res, (err) => {
    if (err) return next(err);
    if (!req.shareTokenAuth) {
      return next(new UnauthenticatedError('Portal authentication or quote token required.', 'AUTH_REQUIRED'));
    }
    next();
  });
}

const router = Router();

router.get('/', authenticatePortal, ctrl.listQuotes);
router.get('/:id', optionalPortalAuth, ctrl.getQuoteDetail);
router.get('/:id/negotiation', optionalPortalAuth, portalCtrl.getTimeline);

router.post('/:id/negotiation-requests', authenticatePortal, validateCreateRequest, portalCtrl.createRequest);
router.post('/:id/comments', authenticatePortal, validateComment, portalCtrl.addComment);
router.post('/:id/confirm', authenticatePortal, ctrl.confirmQuote);

export default router;

import { Router } from 'express';
import * as ctrl from './negotiation.internal.controller.js';
import { validateComment, validateResolve } from './negotiation.validator.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';

const ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'];

export const quotationNegotiationRouter = Router();
quotationNegotiationRouter.use(authenticate);
quotationNegotiationRouter.get('/:id/negotiation-requests', authorize(...ROLES), ctrl.listRequests);
quotationNegotiationRouter.get('/:id/negotiation', authorize(...ROLES), ctrl.getTimeline);
quotationNegotiationRouter.post('/:id/negotiation-comments', authorize(...ROLES), validateComment, ctrl.addComment);

export const requestActionsRouter = Router();
requestActionsRouter.use(authenticate);
requestActionsRouter.post('/:id/resolve', authorize(...ROLES), validateResolve, ctrl.resolveRequest);

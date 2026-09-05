import { Router } from 'express';
import * as ctrl from './customerPortalUsers.controller.js';
import { validateCreatePortalUser } from './customerPortalUsers.validator.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';

const ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'];

const router = Router({ mergeParams: true });

router.use(authenticate);
router.get('/', authorize(...ROLES), ctrl.listPortalUsers);
router.post('/', authorize(...ROLES), validateCreatePortalUser, ctrl.createPortalUser);

export default router;

import { Router } from 'express';
import * as ctrl from './quotationSharing.controller.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';

const ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'];

const router = Router();
router.use(authenticate);
router.post('/:id/portal/share', authorize(...ROLES), ctrl.shareQuotation);

export default router;

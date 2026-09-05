import { Router } from 'express';
import * as ctrl from './payments.controller.js';
import { validateCreatePayment } from './payments.validator.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';

const READ_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'];
const WRITE_ROLES = ['FINANCE', 'OPERATIONS', 'ADMIN'];

const router = Router();
router.use(authenticate);
router.get('/:id/payments', authorize(...READ_ROLES), ctrl.listPayments);
router.post('/:id/payments', authorize(...WRITE_ROLES), validateCreatePayment, ctrl.recordPayment);

export default router;

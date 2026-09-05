import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { validateCreatePlan, validateUpdatePlan } from './subscriptionPlans.validator.js';
import * as ctrl from './subscriptionPlans.controller.js';

const router = Router();
router.use(authenticate);

// Read — any authenticated internal role
router.get('/', ctrl.listPlans);
router.get('/:id', ctrl.getPlan);

// Write — ADMIN only
router.post('/', authorize('ADMIN'), validateCreatePlan, ctrl.createPlan);
router.patch('/:id', authorize('ADMIN'), validateUpdatePlan, ctrl.updatePlan);

export default router;

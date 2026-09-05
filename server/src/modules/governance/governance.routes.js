import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import {
  validateSetTierLimit,
  validateSetCategoryLimit,
  validateCreateApprovalRule,
  validateUpdateApprovalRule,
} from './governance.validator.js';
import {
  handleGetGovernanceOverview,
  handleGetTierLimits,
  handleSetTierLimit,
  handleGetCategoryLimits,
  handleSetCategoryLimit,
  handleDeleteCategoryLimit,
  handleGetApprovalRules,
  handleCreateApprovalRule,
  handleUpdateApprovalRule,
  handleDeleteApprovalRule,
} from './governance.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// Overview / read routes (Admin only)
router.get('/overview', asyncHandler(handleGetGovernanceOverview));
router.get('/tier-limits', asyncHandler(handleGetTierLimits));
router.get('/category-limits', asyncHandler(handleGetCategoryLimits));
router.get('/approval-rules', asyncHandler(handleGetApprovalRules));

// Mutations (Admin only)
router.post('/tier-limits', validateSetTierLimit, asyncHandler(handleSetTierLimit));
router.post('/category-limits', validateSetCategoryLimit, asyncHandler(handleSetCategoryLimit));
router.delete('/category-limits/:id', asyncHandler(handleDeleteCategoryLimit));

router.post('/approval-rules', validateCreateApprovalRule, asyncHandler(handleCreateApprovalRule));
router.patch('/approval-rules/:id', validateUpdateApprovalRule, asyncHandler(handleUpdateApprovalRule));
router.delete('/approval-rules/:id', asyncHandler(handleDeleteApprovalRule));

export default router;

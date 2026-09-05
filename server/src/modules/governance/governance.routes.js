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

// Overview / read routes (all authenticated users can read policy rules)
router.get('/overview', asyncHandler(handleGetGovernanceOverview));
router.get('/tier-limits', asyncHandler(handleGetTierLimits));
router.get('/category-limits', asyncHandler(handleGetCategoryLimits));
router.get('/approval-rules', asyncHandler(handleGetApprovalRules));

// Mutations (Admin and Sales Manager can manage discount policies)
router.post('/tier-limits', authorize('ADMIN'), validateSetTierLimit, asyncHandler(handleSetTierLimit));
router.post('/category-limits', authorize('ADMIN'), validateSetCategoryLimit, asyncHandler(handleSetCategoryLimit));
router.delete('/category-limits/:id', authorize('ADMIN'), asyncHandler(handleDeleteCategoryLimit));

router.post('/approval-rules', authorize('ADMIN'), validateCreateApprovalRule, asyncHandler(handleCreateApprovalRule));
router.patch('/approval-rules/:id', authorize('ADMIN'), validateUpdateApprovalRule, asyncHandler(handleUpdateApprovalRule));
router.delete('/approval-rules/:id', authorize('ADMIN'), asyncHandler(handleDeleteApprovalRule));

export default router;

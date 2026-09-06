import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import {
  handleListApprovalRequests,
  handleGetApprovalDetail,
  handleApproveRequest,
  handleRejectRequest,
  handleReturnRequest,
} from './approval.controller.js';

const router = Router();

router.use(authenticate);

// List approval requests (scoped for SALES_MANAGER, FINANCE, OPERATIONS, ADMIN)
router.get(
  '/',
  authorize('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'),
  asyncHandler(handleListApprovalRequests)
);

// Detail view with explainability breakdown
router.get(
  '/:id',
  authorize('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'),
  asyncHandler(handleGetApprovalDetail)
);

// Decision actions
router.post(
  '/:id/approve',
  authorize('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'),
  asyncHandler(handleApproveRequest)
);

router.post(
  '/:id/reject',
  authorize('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'),
  asyncHandler(handleRejectRequest)
);

router.post(
  '/:id/return',
  authorize('SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'),
  asyncHandler(handleReturnRequest)
);

export default router;

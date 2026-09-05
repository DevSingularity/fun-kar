import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import {
  handleListDealHealth,
  handleGetDealDetail,
  handleNudgeDeal,
  handleEscalateDeal,
  handleAddDealComment,
  handleAcknowledgeAlert,
  handleEscalateAlert,
} from './dealHealth.controller.js';

const router = Router();
router.use(authenticate);

// Restricted to SALES_MANAGER and ADMIN
router.get('/', authorize('SALES_MANAGER', 'ADMIN'), asyncHandler(handleListDealHealth));

// Alert specific mutations (before parameterized :quotationId)
router.post('/alerts/:alertId/acknowledge', authorize('SALES_MANAGER', 'ADMIN'), asyncHandler(handleAcknowledgeAlert));
router.post('/alerts/:alertId/escalate', authorize('SALES_MANAGER', 'ADMIN'), asyncHandler(handleEscalateAlert));

// Deal detail & actions
router.get('/:quotationId', authorize('SALES_MANAGER', 'ADMIN'), asyncHandler(handleGetDealDetail));
router.post('/:quotationId/nudge', authorize('SALES_MANAGER', 'ADMIN'), asyncHandler(handleNudgeDeal));
router.post('/:quotationId/escalate', authorize('SALES_MANAGER', 'ADMIN'), asyncHandler(handleEscalateDeal));
router.post('/:quotationId/comments', authorize('SALES_MANAGER', 'ADMIN'), asyncHandler(handleAddDealComment));

export default router;

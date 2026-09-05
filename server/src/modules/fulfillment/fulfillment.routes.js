import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import {
  handleCreateOrderFromQuotation,
  handleGetOrderFulfillmentDetail,
  handleAllocateOrder,
  handleOverrideAllocation,
  handleConsolidateBackorder,
  handleListFulfillmentOrders,
} from './fulfillment.controller.js';

const router = Router();

router.use(authenticate);

// Orders listing awaiting fulfillment (Table 2 on Wireframe 7)
router.get('/', authorize('OPERATIONS', 'ADMIN', 'SALES_MANAGER', 'FINANCE'), asyncHandler(handleListFulfillmentOrders));

// Convert approved quotation to order (Plan §5.2 gap fill)
router.post(
  '/from-quotation/:quotationId',
  authorize('SALES_REP', 'SALES_MANAGER', 'OPERATIONS', 'ADMIN'),
  asyncHandler(handleCreateOrderFromQuotation)
);

// Order Fulfillment Detail & Split view (Wireframe 8)
router.get(
  '/:id',
  authorize('OPERATIONS', 'ADMIN', 'SALES_MANAGER', 'FINANCE'),
  asyncHandler(handleGetOrderFulfillmentDetail)
);
router.get(
  '/:id/allocation',
  authorize('OPERATIONS', 'ADMIN', 'SALES_MANAGER', 'FINANCE'),
  asyncHandler(handleGetOrderFulfillmentDetail)
);

// Auto Allocation Engine execution
router.post(
  '/:id/allocate',
  authorize('OPERATIONS', 'ADMIN'),
  asyncHandler(handleAllocateOrder)
);

// Manual Override execution
router.put(
  '/:id/allocation',
  authorize('OPERATIONS', 'ADMIN'),
  asyncHandler(handleOverrideAllocation)
);

// Backorder Consolidation execution
router.post(
  '/:id/backorder/consolidate',
  authorize('OPERATIONS', 'ADMIN'),
  asyncHandler(handleConsolidateBackorder)
);

export default router;

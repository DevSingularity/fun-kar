import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import {
  validateCreateQuotation,
  validateUpdateQuotation,
  validateAddItem,
  validateUpdateItem,
} from './quotations.validator.js';
import {
  handleListQuotations,
  handleGetPipeline,
  handleGetQuotation,
  handleCreateQuotation,
  handleUpdateQuotation,
  handleDeleteQuotation,
  handleAddLineItem,
  handleUpdateLineItem,
  handleRemoveLineItem,
  handleSubmitQuotation,
  handleWithdrawQuotation,
} from './quotations.controller.js';

const router = Router();

router.use(authenticate);

// List & Pipeline
router.get('/', asyncHandler(handleListQuotations));
router.get('/pipeline', asyncHandler(handleGetPipeline));
router.get('/:id', asyncHandler(handleGetQuotation));

// Quotation Header CRUD
router.post('/', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), validateCreateQuotation, asyncHandler(handleCreateQuotation));
router.patch('/:id', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), validateUpdateQuotation, asyncHandler(handleUpdateQuotation));
router.delete('/:id', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), asyncHandler(handleDeleteQuotation));

// Line Items CRUD
router.post('/:id/items', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), validateAddItem, asyncHandler(handleAddLineItem));
router.patch('/:id/items/:itemId', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), validateUpdateItem, asyncHandler(handleUpdateLineItem));
router.delete('/:id/items/:itemId', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), asyncHandler(handleRemoveLineItem));

// Submit Trigger & Risk Check
router.post('/:id/submit', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), asyncHandler(handleSubmitQuotation));

// Self-service Withdraw back to DRAFT
router.post('/:id/withdraw', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), asyncHandler(handleWithdrawQuotation));

export default router;


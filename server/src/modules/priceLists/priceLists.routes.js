import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { validateCreatePriceList, validateUpsertItem } from './priceLists.validator.js';
import {
  handleListPriceLists,
  handleGetPriceList,
  handleCreatePriceList,
  handleUpdatePriceList,
  handleUpsertItem,
  handleDeleteItem,
  handleResolvePrice,
} from './priceLists.controller.js';

const router = Router();

router.use(authenticate);

// Price resolution endpoint
router.get('/resolve', asyncHandler(handleResolvePrice));

// Price lists CRUD
router.get('/', asyncHandler(handleListPriceLists));
router.get('/:id', asyncHandler(handleGetPriceList));

router.post('/', authorize('ADMIN'), validateCreatePriceList, asyncHandler(handleCreatePriceList));
router.patch('/:id', authorize('ADMIN'), asyncHandler(handleUpdatePriceList));
router.put('/:id/items', authorize('ADMIN'), validateUpsertItem, asyncHandler(handleUpsertItem));
router.delete('/:id/items/:itemId', authorize('ADMIN'), asyncHandler(handleDeleteItem));

export default router;

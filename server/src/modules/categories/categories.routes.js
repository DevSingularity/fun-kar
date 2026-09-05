import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { validateCreateCategory, validateUpdateCategory } from './categories.validator.js';
import {
  handleListCategories,
  handleGetCategory,
  handleCreateCategory,
  handleUpdateCategory,
  handleDeleteCategory,
} from './categories.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(handleListCategories));
router.get('/:id', asyncHandler(handleGetCategory));

// Admin control plane
router.post('/', authorize('ADMIN'), validateCreateCategory, asyncHandler(handleCreateCategory));
router.patch('/:id', authorize('ADMIN'), validateUpdateCategory, asyncHandler(handleUpdateCategory));
router.delete('/:id', authorize('ADMIN'), asyncHandler(handleDeleteCategory));

export default router;

import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { validateCreateProduct, validateUpdateProduct } from './products.validator.js';
import {
  handleListProducts,
  handleGetProduct,
  handleCreateProduct,
  handleUpdateProduct,
  handleDeleteProduct,
} from './products.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(handleListProducts));
router.get('/:id', asyncHandler(handleGetProduct));

// Admin only mutation
router.post('/', authorize('ADMIN'), validateCreateProduct, asyncHandler(handleCreateProduct));
router.patch('/:id', authorize('ADMIN'), validateUpdateProduct, asyncHandler(handleUpdateProduct));
router.delete('/:id', authorize('ADMIN'), asyncHandler(handleDeleteProduct));

export default router;

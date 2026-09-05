import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { validateCreateCustomer, validateUpdateCustomer } from './customers.validator.js';
import {
  handleListCustomers,
  handleGetCustomer,
  handleCreateCustomer,
  handleUpdateCustomer,
  handleDeleteCustomer,
} from './customers.controller.js';

const router = Router();

router.use(authenticate);

// All authenticated roles can list and view customers
router.get('/', asyncHandler(handleListCustomers));
router.get('/:id', asyncHandler(handleGetCustomer));

// Rep, Manager, Admin can create and update
router.post('/', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), validateCreateCustomer, asyncHandler(handleCreateCustomer));
router.patch('/:id', authorize('SALES_REP', 'SALES_MANAGER', 'ADMIN'), validateUpdateCustomer, asyncHandler(handleUpdateCustomer));

// Admin only can hard delete customers
router.delete('/:id', authorize('ADMIN'), asyncHandler(handleDeleteCustomer));

export default router;

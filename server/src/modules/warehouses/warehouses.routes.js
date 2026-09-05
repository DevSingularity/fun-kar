import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import {
  handleListWarehouses,
  handleGetWarehouse,
  handleCreateWarehouse,
  handleUpdateWarehouse,
  handleListWarehouseStock,
  handleSetWarehouseStock,
  handleGetLiveStockOverview,
} from './warehouses.controller.js';

const router = Router();

router.use(authenticate);

// Live stock aggregated summary across warehouses (Table 1 on Wireframe 7)
router.get('/overview/stock-summary', asyncHandler(handleGetLiveStockOverview));

// Warehouses list & detail (accessible by all authenticated users)
router.get('/', asyncHandler(handleListWarehouses));
router.get('/:id', asyncHandler(handleGetWarehouse));

// Warehouse stock list
router.get('/:id/stock', asyncHandler(handleListWarehouseStock));

// Admin mutations
router.post('/', authorize('ADMIN'), asyncHandler(handleCreateWarehouse));
router.patch('/:id', authorize('ADMIN'), asyncHandler(handleUpdateWarehouse));
router.put('/:id/stock/:productId', authorize('ADMIN'), asyncHandler(handleSetWarehouseStock));

export default router;

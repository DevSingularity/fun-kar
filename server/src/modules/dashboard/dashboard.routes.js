import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { handleGetDashboardOverview } from './dashboard.controller.js';

const router = Router();

router.get('/overview', authenticate, asyncHandler(handleGetDashboardOverview));

export default router;

import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import healthRouter from './health.route.js';

const router = Router();

// Health Check
router.use(healthRouter);

// Core Modules
router.use('/auth', authRoutes);

export default router;

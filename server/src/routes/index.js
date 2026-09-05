/**
 * Route barrel
 *
 * Mount new routers here as you add domain features.
 * Pattern: import router → router.use('/your-resource', yourRouter)
 */
import { Router } from 'express';
import healthRouter   from './health.route.js';
import authRouter     from './auth.route.js';
import resourceRouter from './resource.route.js';

const router = Router();

router.use(healthRouter);
router.use('/auth',      authRouter);
// TODO: rename '/resources' to match your domain entity (e.g. '/products', '/orders')
router.use('/resources', resourceRouter);

// TODO: Add more routers below as you build out features
// import productsRouter from './products.route.js';
// router.use('/products', productsRouter);

export default router;

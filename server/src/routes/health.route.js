import { Router } from 'express';
const router = Router();
router.get('/health', (_, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
export default router;

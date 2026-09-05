import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { validateRiskEvaluation } from './risk.validator.js';
import { handleEvaluateQuoteRisk } from './risk.controller.js';

const router = Router();

router.use(authenticate);

// All authenticated sales reps, managers, and admins can evaluate quote risk in real-time
router.post('/evaluate', validateRiskEvaluation, asyncHandler(handleEvaluateQuoteRisk));

export default router;

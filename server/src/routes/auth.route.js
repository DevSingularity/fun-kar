import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginController, logoutController, refreshController, registerController, getMeController } from '../controllers/auth.controller.js';
import { validateLoginPayload, validateRegisterPayload } from '../validators/auth.validator.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

function validate(validatorFn) {
  return (req, res, next) => {
    const { valid, errors } = validatorFn(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed.', errors });
    return next();
  };
}

router.post('/register', authLimiter, validate(validateRegisterPayload), registerController);
router.post('/login',    authLimiter, validate(validateLoginPayload),    loginController);
router.post('/refresh',  authLimiter, refreshController);
router.post('/logout',   authLimiter, logoutController);
router.get('/me',        verifyToken, getMeController);

export default router;

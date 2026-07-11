import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from './auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/signup', authRateLimiter, asyncHandler(authController.signup));
router.post('/login', authRateLimiter, asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/change-password', requireAuth, authRateLimiter, asyncHandler(authController.changePassword));

export { router as authRoutes };

import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from './auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/signup', asyncHandler(authController.signup));
router.post('/login', asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));

export { router as authRoutes };

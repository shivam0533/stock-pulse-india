import { Router } from 'express';
import { subscriptionController } from './subscription.controller';
import { requireAuth } from '../auth/auth.middleware';
import { paymentRequestRateLimiter } from '../middleware/rateLimit.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// requireAuth only — deliberately NOT requireActiveSubscription, or a
// locked-out user could never view their own status or pay to unlock.
router.use(requireAuth);

router.get('/status', asyncHandler(subscriptionController.getStatus));
router.post('/payment-request', paymentRequestRateLimiter, asyncHandler(subscriptionController.submitPaymentRequest));

export { router as subscriptionRoutes };

import { Router } from 'express';
import { adminSubscriptionController } from './adminSubscription.controller';
import { requireAuth, requireAdmin } from '../../auth/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// ADMIN and SUPER_ADMIN both pass — the spec doesn't carve payment/
// subscription review out as a SUPER_ADMIN-only "manage admins/settings"
// capability the way RBAC did for role changes and app settings.
router.use(requireAuth, requireAdmin);

router.get('/payment-requests', asyncHandler(adminSubscriptionController.listPaymentRequests));
router.get('/payment-requests/:id', asyncHandler(adminSubscriptionController.getPaymentRequestDetail));
router.post('/payment-requests/:id/approve', asyncHandler(adminSubscriptionController.approvePaymentRequest));
router.post('/payment-requests/:id/reject', asyncHandler(adminSubscriptionController.rejectPaymentRequest));

router.get('/users', asyncHandler(adminSubscriptionController.listUsersByBucket));
router.post('/users/:id/activate', asyncHandler(adminSubscriptionController.activateSubscription));
router.post('/users/:id/extend', asyncHandler(adminSubscriptionController.extendSubscription));
router.post('/users/:id/cancel', asyncHandler(adminSubscriptionController.cancelSubscription));

export { router as adminSubscriptionRoutes };

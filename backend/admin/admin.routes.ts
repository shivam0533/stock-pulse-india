import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireAdmin } from '../auth/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Every /api/admin/* route requires a real logged-in user (requireAuth) AND
// role === 'admin' (requireAdmin) — role is verified server-side from the
// JWT, never trusted from the client. See auth.middleware.ts.
router.use(requireAuth, requireAdmin);

router.get('/dashboard', asyncHandler(adminController.getDashboard));

router.get('/users', asyncHandler(adminController.listUsers));
router.get('/users/:id', asyncHandler(adminController.getUser));

router.get('/support/search', asyncHandler(adminController.searchSupport));

router.get('/logs/login', asyncHandler(adminController.listLoginLogs));
router.get('/logs/admin-actions', asyncHandler(adminController.listAdminLogs));

router.get('/analytics/signups', asyncHandler(adminController.getSignupsPerDay));

router.post('/notifications', asyncHandler(adminController.createNotification));
router.get('/notifications', asyncHandler(adminController.listNotifications));

router.get('/settings', asyncHandler(adminController.getSettings));
router.put('/settings', asyncHandler(adminController.updateSettings));

export { router as adminRoutes };

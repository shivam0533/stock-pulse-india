import { Router } from 'express';
import { adminController } from './admin.controller';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../auth/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Every /api/admin/* route requires a real logged-in user (requireAuth) AND
// role === 'admin' OR 'super_admin' (requireAdmin) — role is verified
// server-side from the JWT, never trusted from the client. A few routes
// below additionally require requireSuperAdmin — the SUPER_ADMIN-only
// surface (managing roles, app-wide Settings) that plain ADMIN cannot
// reach even though it passes the router-wide check here.
router.use(requireAuth, requireAdmin);

router.get('/dashboard', asyncHandler(adminController.getDashboard));

router.get('/users', asyncHandler(adminController.listUsers));
router.get('/users/:id', asyncHandler(adminController.getUser));
// SUPER_ADMIN only — changing a user's role is the "manage admins" capability.
router.put('/users/:id/role', requireSuperAdmin, asyncHandler(adminController.updateUserRole));

router.get('/support/search', asyncHandler(adminController.searchSupport));

router.get('/logs/login', asyncHandler(adminController.listLoginLogs));
router.get('/logs/admin-actions', asyncHandler(adminController.listAdminLogs));

router.get('/analytics/signups', asyncHandler(adminController.getSignupsPerDay));

router.post('/notifications', asyncHandler(adminController.createNotification));
router.get('/notifications', asyncHandler(adminController.listNotifications));

// SUPER_ADMIN only — "manage settings" (Maintenance Mode, Trading
// Enabled, Risk/Notification Defaults) is not part of ADMIN's permission
// set.
router.get('/settings', requireSuperAdmin, asyncHandler(adminController.getSettings));
router.put('/settings', requireSuperAdmin, asyncHandler(adminController.updateSettings));

export { router as adminRoutes };

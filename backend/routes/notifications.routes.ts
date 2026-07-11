import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { adminService } from '../admin/admin.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Regular-user-facing surface for admin-sent notifications — any logged-in
 * user (not just admins) can poll their own unread notifications and mark
 * them read. Reuses adminService's read/write helpers since the underlying
 * tables (notifications/notification_reads) are the same; this is the only
 * consumer-facing entry point into them.
 */
router.get('/unread', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const items = await adminService.listUnreadNotificationsForUser(req.userId!);
    sendSuccess(res, items);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load notifications.';
    sendError(res, message, 500);
  }
}));

router.post('/mark-read', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    await adminService.markNotificationsRead(req.userId!, ids);
    sendSuccess(res, { success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark notifications read.';
    sendError(res, message, 500);
  }
}));

export { router as userNotificationsRoutes };

import type { Request, Response } from 'express';
import { adminService } from './admin.service';
import { AdminApiError } from './admin.errors';
import { sendSuccess, sendError } from '../utils/apiResponse';
import type { NotificationType } from './admin.types';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ROLES = ['user', 'admin', 'super_admin'] as const;

/**
 * AdminApiError carries a deliberately curated, safe-to-show message (e.g.
 * "you can't demote yourself") — passed through as-is. Anything else (e.g.
 * a raw Postgres error) is an internal detail, not something an API
 * consumer should see; logged server-side instead.
 */
function handleError(res: Response, err: unknown): void {
  if (err instanceof AdminApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[Admin API] error:', err);
  sendError(res, 'Something went wrong. Please try again.', 500);
}

function pagination(req: Request): { page: number; pageSize: number } {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20) || 20));
  return { page, pageSize };
}

const VALID_NOTIFICATION_TYPES: NotificationType[] = ['system', 'maintenance', 'market-alert', 'popup'];

export const adminController = {
  async getDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      sendSuccess(res, stats);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize } = pagination(req);
      const result = await adminService.listUsers({
        page,
        pageSize,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
        sortDir: req.query.sortDir === 'asc' ? 'asc' : 'desc',
      });
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid user id.', 400);
        return;
      }
      const user = await adminService.getUserById(req.params.id);
      if (!user) {
        sendError(res, 'User not found.', 404);
        return;
      }
      sendSuccess(res, user);
    } catch (err) {
      handleError(res, err);
    }
  },

  async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid user id.', 400);
        return;
      }
      const { role } = req.body ?? {};
      if (!VALID_ROLES.includes(role)) {
        sendError(res, `Invalid role. Use one of: ${VALID_ROLES.join(', ')}.`, 400);
        return;
      }
      const updated = await adminService.updateUserRole(req.params.id, role, req.userId!);
      await adminService.logAction(req.userId!, 'user.role_change', req.params.id, { newRole: role });
      sendSuccess(res, updated);
    } catch (err) {
      handleError(res, err);
    }
  },

  async searchSupport(req: Request, res: Response): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const result = await adminService.listUsers({ page: 1, pageSize: 20, search: q });
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listLoginLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize } = pagination(req);
      const result = await adminService.listLoginLogs({ page, pageSize });
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listAdminLogs(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize } = pagination(req);
      const result = await adminService.listAdminLogs({ page, pageSize });
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const { title, message, type, targetUserId } = req.body ?? {};
      if (!title?.trim() || !message?.trim()) {
        sendError(res, 'Title and message are required.', 400);
        return;
      }
      if (targetUserId && !UUID_PATTERN.test(targetUserId)) {
        sendError(res, 'Invalid target user id.', 400);
        return;
      }
      const notifType: NotificationType = VALID_NOTIFICATION_TYPES.includes(type) ? type : 'system';
      const notification = await adminService.createNotification({
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        targetUserId: targetUserId || null,
        createdBy: req.userId!,
      });
      await adminService.logAction(
        req.userId!,
        'notification.send',
        targetUserId || 'all-users',
        { title, type: notifType },
      );
      sendSuccess(res, notification, 201);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize } = pagination(req);
      const result = await adminService.listNotifications({ page, pageSize });
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getSignupsPerDay(req: Request, res: Response): Promise<void> {
    try {
      const days = Math.min(365, Math.max(1, Number(req.query.days ?? 30) || 30));
      const series = await adminService.getSignupsPerDay(days);
      sendSuccess(res, series);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getSettings(_req: Request, res: Response): Promise<void> {
    try {
      const settings = await adminService.getSettings();
      sendSuccess(res, settings);
    } catch (err) {
      handleError(res, err);
    }
  },

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body ?? {};
      await adminService.updateSettings(updates, req.userId!);
      await adminService.logAction(req.userId!, 'settings.update', undefined, updates);
      const settings = await adminService.getSettings();
      sendSuccess(res, settings);
    } catch (err) {
      handleError(res, err);
    }
  },
};

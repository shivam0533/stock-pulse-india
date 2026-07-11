import type { Request, Response } from 'express';
import { adminSubscriptionService } from './adminSubscription.service';
import { adminService } from '../../admin/admin.service';
import { AdminApiError } from '../../admin/admin.errors';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import type { PaymentRequestStatus } from '../subscription.types';
import type { SubscriptionStatus } from '../access.util';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_PAYMENT_STATUSES: PaymentRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
const VALID_SUBSCRIPTION_BUCKETS: SubscriptionStatus[] = ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'];

function handleError(res: Response, err: unknown): void {
  if (err instanceof AdminApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[Admin Subscription API] error:', err);
  sendError(res, 'Something went wrong. Please try again.', 500);
}

function pagination(req: Request): { page: number; pageSize: number } {
  const page = Math.max(1, Number(req.query.page ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20) || 20));
  return { page, pageSize };
}

export const adminSubscriptionController = {
  async listPaymentRequests(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize } = pagination(req);
      const status = typeof req.query.status === 'string' && VALID_PAYMENT_STATUSES.includes(req.query.status as PaymentRequestStatus)
        ? (req.query.status as PaymentRequestStatus)
        : undefined;
      const result = await adminSubscriptionService.listPaymentRequests({ status, page, pageSize });
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async getPaymentRequestDetail(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid payment request id.', 400);
        return;
      }
      const detail = await adminSubscriptionService.getPaymentRequestDetail(req.params.id);
      if (!detail) {
        sendError(res, 'Payment request not found.', 404);
        return;
      }
      sendSuccess(res, detail);
    } catch (err) {
      handleError(res, err);
    }
  },

  async listUsersByBucket(req: Request, res: Response): Promise<void> {
    try {
      const { page, pageSize } = pagination(req);
      const bucket = typeof req.query.bucket === 'string' && VALID_SUBSCRIPTION_BUCKETS.includes(req.query.bucket as SubscriptionStatus)
        ? (req.query.bucket as SubscriptionStatus)
        : undefined;
      const result = await adminSubscriptionService.listUsersByBucket({ bucket, page, pageSize });
      sendSuccess(res, result);
    } catch (err) {
      handleError(res, err);
    }
  },

  async approvePaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid payment request id.', 400);
        return;
      }
      await adminSubscriptionService.approvePaymentRequest(req.params.id, req.userId!);
      await adminService.logAction(req.userId!, 'subscription.payment_approved', req.params.id);
      sendSuccess(res, { approved: true });
    } catch (err) {
      handleError(res, err);
    }
  },

  async rejectPaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid payment request id.', 400);
        return;
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() || null : null;
      await adminSubscriptionService.rejectPaymentRequest(req.params.id, req.userId!, reason);
      await adminService.logAction(req.userId!, 'subscription.payment_rejected', req.params.id, { reason });
      sendSuccess(res, { rejected: true });
    } catch (err) {
      handleError(res, err);
    }
  },

  async activateSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid user id.', 400);
        return;
      }
      const days = Math.max(1, Number(req.body?.days ?? 30) || 30);
      await adminSubscriptionService.activateSubscription(req.params.id, days);
      await adminService.logAction(req.userId!, 'subscription.activated', req.params.id, { days });
      sendSuccess(res, { activated: true });
    } catch (err) {
      handleError(res, err);
    }
  },

  async extendSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid user id.', 400);
        return;
      }
      const days = Number(req.body?.days);
      await adminSubscriptionService.extendSubscription(req.params.id, days);
      await adminService.logAction(req.userId!, 'subscription.extended', req.params.id, { days });
      sendSuccess(res, { extended: true });
    } catch (err) {
      handleError(res, err);
    }
  },

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    try {
      if (!UUID_PATTERN.test(req.params.id)) {
        sendError(res, 'Invalid user id.', 400);
        return;
      }
      await adminSubscriptionService.cancelSubscription(req.params.id);
      await adminService.logAction(req.userId!, 'subscription.cancelled', req.params.id);
      sendSuccess(res, { cancelled: true });
    } catch (err) {
      handleError(res, err);
    }
  },
};

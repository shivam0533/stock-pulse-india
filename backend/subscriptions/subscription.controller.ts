import type { Request, Response } from 'express';
import { subscriptionService } from './subscription.service';
import { SubscriptionApiError } from './subscription.errors';
import { sendSuccess, sendError } from '../utils/apiResponse';

function handleError(res: Response, err: unknown): void {
  if (err instanceof SubscriptionApiError) {
    sendError(res, err.message, err.statusCode);
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[Subscription API] error:', err);
  sendError(res, 'Something went wrong. Please try again.', 500);
}

export const subscriptionController = {
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await subscriptionService.getStatus(req.userId!);
      sendSuccess(res, status);
    } catch (err) {
      handleError(res, err);
    }
  },

  async submitPaymentRequest(req: Request, res: Response): Promise<void> {
    try {
      const { utr, screenshot } = req.body ?? {};
      const created = await subscriptionService.submitPaymentRequest(req.userId!, utr, screenshot || null);
      sendSuccess(res, created, 201);
    } catch (err) {
      handleError(res, err);
    }
  },
};

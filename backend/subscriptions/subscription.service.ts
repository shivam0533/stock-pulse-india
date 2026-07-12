import { randomUUID } from 'node:crypto';
import { pool } from '../db/pool';
import { SubscriptionApiError } from './subscription.errors';
import { isTradingLocked, type SubscriptionStatus } from './access.util';
import { SUBSCRIPTION_PLANS, getPlanById } from './plans';
import type { PaymentRequestEntry, PaymentRequestStatus, SubscriptionStatusResponse } from './subscription.types';
import type { AppUserRole } from '../auth/auth.types';

interface UserAccessRow {
  role: AppUserRole;
  subscription_status: SubscriptionStatus;
  trial_end_date: string | null;
  subscription_end_date: string | null;
}

interface PaymentRequestRow {
  id: string;
  user_id: string;
  utr: string;
  screenshot: string | null;
  plan_id: string;
  duration_days: number;
  amount_inr: string;
  status: PaymentRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

function toPaymentRequestEntry(row: PaymentRequestRow): PaymentRequestEntry {
  return {
    id: row.id,
    userId: row.user_id,
    utr: row.utr,
    hasScreenshot: row.screenshot !== null,
    planId: row.plan_id,
    durationDays: row.duration_days,
    amountInr: Number(row.amount_inr),
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : null,
    rejectionReason: row.rejection_reason,
    createdAt: new Date(row.created_at).getTime(),
  };
}

const MAX_SCREENSHOT_LENGTH = 4 * 1024 * 1024; // ~4MB of base64 text — frontend downsizes before encoding, this is a hard ceiling

class SubscriptionService {
  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    const userResult = await pool.query<UserAccessRow>(
      'SELECT role, subscription_status, trial_end_date, subscription_end_date FROM users WHERE id = $1',
      [userId],
    );
    const user = userResult.rows[0];
    if (!user) {
      throw new SubscriptionApiError('User not found.', 404);
    }

    const trialEndDate = user.trial_end_date ? new Date(user.trial_end_date).getTime() : null;
    const subscriptionEndDate = user.subscription_end_date ? new Date(user.subscription_end_date).getTime() : null;

    const requestsResult = await pool.query<PaymentRequestRow>(
      'SELECT * FROM payment_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId],
    );

    return {
      subscriptionStatus: user.subscription_status,
      trialEndDate,
      subscriptionEndDate,
      isTradingLocked: isTradingLocked({
        role: user.role,
        subscriptionStatus: user.subscription_status,
        trialEndDate,
        subscriptionEndDate,
      }),
      plans: SUBSCRIPTION_PLANS,
      paymentRequests: requestsResult.rows.map(toPaymentRequestEntry),
    };
  }

  async submitPaymentRequest(userId: string, planId: string, utr: string, screenshot: string | null): Promise<PaymentRequestEntry> {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new SubscriptionApiError('Please select a valid plan.', 400);
    }
    const trimmedUtr = utr?.trim();
    if (!trimmedUtr) {
      throw new SubscriptionApiError('UTR / Transaction ID is required.', 400);
    }
    if (screenshot && screenshot.length > MAX_SCREENSHOT_LENGTH) {
      throw new SubscriptionApiError('Screenshot is too large. Please use a smaller image.', 400);
    }

    const existingPending = await pool.query(
      `SELECT id FROM payment_requests WHERE user_id = $1 AND status = 'PENDING'`,
      [userId],
    );
    if (existingPending.rows.length > 0) {
      throw new SubscriptionApiError('You already have a pending payment request awaiting review.', 409);
    }

    const result = await pool.query<PaymentRequestRow>(
      `INSERT INTO payment_requests (id, user_id, utr, screenshot, plan_id, duration_days, amount_inr)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [randomUUID(), userId, trimmedUtr, screenshot || null, plan.id, plan.durationDays, plan.priceInr],
    );
    return toPaymentRequestEntry(result.rows[0]);
  }
}

export const subscriptionService = new SubscriptionService();

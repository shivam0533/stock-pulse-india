import { pool } from '../../db/pool';
import { AdminApiError } from '../../admin/admin.errors';
import type { SubscriptionStatus } from '../access.util';
import type {
  AdminPaymentRequestEntry, PaymentRequestDetail, PaymentRequestStatus, SubscriptionUserSummary,
} from '../subscription.types';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface PaymentRequestJoinRow {
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
  user_name: string;
  user_email: string;
}

function toAdminPaymentRequestEntry(row: PaymentRequestJoinRow): AdminPaymentRequestEntry {
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
    userName: row.user_name,
    userEmail: row.user_email,
  };
}

interface UserBucketRow {
  id: string;
  name: string;
  email: string;
  subscription_status: SubscriptionStatus;
  trial_end_date: string | null;
  subscription_end_date: string | null;
}

function toSubscriptionUserSummary(row: UserBucketRow): SubscriptionUserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subscriptionStatus: row.subscription_status,
    trialEndDate: row.trial_end_date ? new Date(row.trial_end_date).getTime() : null,
    subscriptionEndDate: row.subscription_end_date ? new Date(row.subscription_end_date).getTime() : null,
  };
}

class AdminSubscriptionService {
  async listPaymentRequests(opts: { status?: PaymentRequestStatus; page: number; pageSize: number }): Promise<Paginated<AdminPaymentRequestEntry>> {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const whereClause = opts.status ? 'WHERE pr.status = $1' : '';
    const params: unknown[] = opts.status ? [opts.status] : [];

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM payment_requests pr ${whereClause}`,
      params,
    );

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await pool.query<PaymentRequestJoinRow>(
      `SELECT pr.*, u.name AS user_name, u.email AS user_email
       FROM payment_requests pr JOIN users u ON u.id = pr.user_id
       ${whereClause}
       ORDER BY pr.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    return {
      items: result.rows.map(toAdminPaymentRequestEntry),
      total: Number(countResult.rows[0].count),
      page,
      pageSize,
    };
  }

  async getPaymentRequestDetail(id: string): Promise<PaymentRequestDetail | null> {
    const result = await pool.query<PaymentRequestJoinRow>(
      `SELECT pr.*, u.name AS user_name, u.email AS user_email
       FROM payment_requests pr JOIN users u ON u.id = pr.user_id
       WHERE pr.id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { ...toAdminPaymentRequestEntry(row), screenshot: row.screenshot };
  }

  async listUsersByBucket(opts: { bucket?: SubscriptionStatus; page: number; pageSize: number }): Promise<Paginated<SubscriptionUserSummary>> {
    const page = Math.max(1, opts.page);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize));
    const whereClause = opts.bucket ? 'WHERE subscription_status = $1' : '';
    const params: unknown[] = opts.bucket ? [opts.bucket] : [];

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      params,
    );

    const dataParams = [...params, pageSize, (page - 1) * pageSize];
    const result = await pool.query<UserBucketRow>(
      `SELECT id, name, email, subscription_status, trial_end_date, subscription_end_date
       FROM users ${whereClause}
       ORDER BY joined_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      dataParams,
    );

    return {
      items: result.rows.map(toSubscriptionUserSummary),
      total: Number(countResult.rows[0].count),
      page,
      pageSize,
    };
  }

  private async getPendingRequestOrThrow(id: string) {
    const result = await pool.query<{ id: string; user_id: string; status: PaymentRequestStatus; duration_days: number }>(
      'SELECT id, user_id, status, duration_days FROM payment_requests WHERE id = $1',
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new AdminApiError('Payment request not found.', 404);
    if (row.status !== 'PENDING') throw new AdminApiError('This payment request has already been reviewed.', 400);
    return row;
  }

  /**
   * The single choke point that activates a subscription. Today an admin's
   * click calls this after reviewing a manual UTR transfer; a future
   * Razorpay/PhonePe-Gateway/Cashfree webhook would call this exact same
   * method after verifying a real payment signature instead — nothing else
   * in the subscription system needs to change for that swap.
   */
  async approvePaymentRequest(id: string, reviewedBy: string): Promise<void> {
    const request = await this.getPendingRequestOrThrow(id);
    await pool.query(
      `UPDATE payment_requests SET status = 'APPROVED', reviewed_by = $1, reviewed_at = now() WHERE id = $2`,
      [reviewedBy, id],
    );
    // Stacks on top of remaining time if renewed early; starts a fresh
    // period (whatever the purchased plan's duration was) if the
    // subscription had already lapsed.
    await pool.query(
      `UPDATE users SET subscription_status = 'ACTIVE',
        subscription_end_date = GREATEST(now(), COALESCE(subscription_end_date, now())) + ($1 || ' days')::interval
       WHERE id = $2`,
      [request.duration_days, request.user_id],
    );
  }

  async rejectPaymentRequest(id: string, reviewedBy: string, reason: string | null): Promise<void> {
    await this.getPendingRequestOrThrow(id);
    await pool.query(
      `UPDATE payment_requests SET status = 'REJECTED', reviewed_by = $1, reviewed_at = now(), rejection_reason = $2 WHERE id = $3`,
      [reviewedBy, reason, id],
    );
  }

  async activateSubscription(userId: string, days: number): Promise<void> {
    const user = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user.rows[0]) throw new AdminApiError('User not found.', 404);
    await pool.query(
      `UPDATE users SET subscription_status = 'ACTIVE', subscription_end_date = now() + ($1 || ' days')::interval WHERE id = $2`,
      [days, userId],
    );
  }

  async extendSubscription(userId: string, days: number): Promise<void> {
    if (!Number.isFinite(days) || days <= 0) {
      throw new AdminApiError('Days must be a positive number.', 400);
    }
    const user = await pool.query<{ id: string; subscription_status: SubscriptionStatus; subscription_end_date: string | null }>(
      'SELECT id, subscription_status, subscription_end_date FROM users WHERE id = $1',
      [userId],
    );
    const row = user.rows[0];
    if (!row) throw new AdminApiError('User not found.', 404);
    await pool.query(
      `UPDATE users SET subscription_status = 'ACTIVE',
        subscription_end_date = GREATEST(now(), COALESCE(subscription_end_date, now())) + ($1 || ' days')::interval
       WHERE id = $2`,
      [days, userId],
    );
  }

  async cancelSubscription(userId: string): Promise<void> {
    const user = await pool.query<{ id: string }>('SELECT id FROM users WHERE id = $1', [userId]);
    if (!user.rows[0]) throw new AdminApiError('User not found.', 404);
    await pool.query(`UPDATE users SET subscription_status = 'CANCELLED' WHERE id = $1`, [userId]);
  }
}

export const adminSubscriptionService = new AdminSubscriptionService();

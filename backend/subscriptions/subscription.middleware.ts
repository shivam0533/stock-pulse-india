import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool';
import { sendError } from '../utils/apiResponse';
import { isTradingLocked, getLockedMessage, type SubscriptionStatus } from './access.util';
import type { AppUserRole } from '../auth/auth.types';

interface AccessRow {
  role: AppUserRole;
  subscription_status: SubscriptionStatus;
  trial_end_date: string | null;
  subscription_end_date: string | null;
}

/**
 * Gates every trading-capable route (broker connect, place/modify/cancel
 * orders, live positions/option-chain). Must run after requireAuth. Queries
 * the users row fresh on every request rather than trusting the JWT —
 * unlike role (accepted up to 7-day staleness), a payment approval needs to
 * unlock trading immediately, not after the user's token happens to refresh.
 */
export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
  const result = await pool.query<AccessRow>(
    'SELECT role, subscription_status, trial_end_date, subscription_end_date FROM users WHERE id = $1',
    [req.userId],
  );
  const row = result.rows[0];
  if (!row) {
    sendError(res, 'Your session has expired. Please log in again.', 401);
    return;
  }

  const locked = isTradingLocked({
    role: row.role,
    subscriptionStatus: row.subscription_status,
    trialEndDate: row.trial_end_date ? new Date(row.trial_end_date).getTime() : null,
    subscriptionEndDate: row.subscription_end_date ? new Date(row.subscription_end_date).getTime() : null,
  });

  if (locked) {
    sendError(res, getLockedMessage(row.subscription_status), 403);
    return;
  }

  next();
}

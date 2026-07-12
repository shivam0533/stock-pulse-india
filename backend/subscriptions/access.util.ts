import type { AppUserRole } from '../auth/auth.types';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface SubscriptionAccessFields {
  role: AppUserRole;
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: number | null;
  subscriptionEndDate: number | null;
}

/**
 * Single source of truth for "can this user trade right now" — used by
 * both toAppUser() (so the frontend can show the right UI without waiting
 * on a 403) and requireActiveSubscription (the actual enforcement). ADMIN
 * and SUPER_ADMIN are always unlocked; a plain USER is locked once their
 * trial or paid subscription window has passed, or if an admin cancelled it.
 */
export function isTradingLocked(user: SubscriptionAccessFields): boolean {
  if (user.role === 'admin' || user.role === 'super_admin') return false;

  switch (user.subscriptionStatus) {
    case 'TRIAL':
      return user.trialEndDate === null || Date.now() >= user.trialEndDate;
    case 'ACTIVE':
      return user.subscriptionEndDate === null || Date.now() >= user.subscriptionEndDate;
    case 'EXPIRED':
    case 'CANCELLED':
      return true;
    default:
      return true;
  }
}

/**
 * The reason shown to a locked-out user — kept separate from
 * isTradingLocked() because *why* someone is locked varies: a lapsed paid
 * subscription or an admin cancellation is not a "trial expired", even
 * though all three result in the same boolean. Mirrored on the frontend in
 * src/utils/subscriptionMessages.ts so the API error and the UI never
 * disagree.
 */
export function getLockedMessage(subscriptionStatus: SubscriptionStatus): string {
  if (subscriptionStatus === 'CANCELLED') {
    return 'Your subscription has been cancelled. Purchase a plan to continue trading.';
  }
  if (subscriptionStatus === 'TRIAL') {
    return 'Your 2-day free trial has expired. Purchase a plan to continue trading.';
  }
  if (subscriptionStatus === 'EXPIRED') {
    return 'Subscribe to a plan to start trading.';
  }
  return 'Your subscription has expired. Purchase a plan to continue trading.';
}

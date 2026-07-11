import type { SubscriptionStatus } from '@/types';

/** Mirrors backend/subscriptions/access.util.ts's getLockedMessage() exactly — the API error and the UI must never disagree on why a user is locked. */
export function getLockedMessage(subscriptionStatus: SubscriptionStatus): string {
  if (subscriptionStatus === 'CANCELLED') {
    return 'Your subscription has been cancelled.';
  }
  if (subscriptionStatus === 'TRIAL') {
    return 'Your 2-day free trial has expired.';
  }
  return 'Your subscription has expired.';
}

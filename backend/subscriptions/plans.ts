export type PlanId = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface SubscriptionPlan {
  id: PlanId;
  label: string;
  priceInr: number;
  durationDays: number;
}

/**
 * Single source of truth for what a user can buy. The payment form, the
 * status response, and approvePaymentRequest's "how many days to add" all
 * key off this list — adding a new tier only ever means adding a row here.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: 'MONTHLY', label: 'Monthly', priceInr: 5999, durationDays: 30 },
  { id: 'QUARTERLY', label: '3 Months', priceInr: 14999, durationDays: 90 },
  { id: 'YEARLY', label: '1 Year', priceInr: 49999, durationDays: 365 },
];

export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}

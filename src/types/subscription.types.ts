import type { SubscriptionStatus } from './auth.types';

export type PaymentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PlanId = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

/** Mirrors backend/subscriptions/plans.ts's SUBSCRIPTION_PLANS exactly — always read from SubscriptionStatusResponse.plans, never hardcoded here. */
export interface SubscriptionPlan {
  id: PlanId;
  label: string;
  priceInr: number;
  durationDays: number;
}

export interface PaymentRequestEntry {
  id: string;
  userId: string;
  utr: string;
  hasScreenshot: boolean;
  planId: string;
  durationDays: number;
  amountInr: number;
  status: PaymentRequestStatus;
  reviewedBy: string | null;
  reviewedAt: number | null;
  rejectionReason: string | null;
  createdAt: number;
}

export interface SubscriptionStatusResponse {
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: number | null;
  subscriptionEndDate: number | null;
  isTradingLocked: boolean;
  plans: SubscriptionPlan[];
  paymentRequests: PaymentRequestEntry[];
}

export interface AdminPaymentRequestEntry extends PaymentRequestEntry {
  userName: string;
  userEmail: string;
}

export interface PaymentRequestDetail extends AdminPaymentRequestEntry {
  screenshot: string | null;
}

export interface SubscriptionUserSummary {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: number | null;
  subscriptionEndDate: number | null;
}

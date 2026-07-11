import type { SubscriptionStatus } from './access.util';

export type PaymentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PaymentRequestEntry {
  id: string;
  userId: string;
  utr: string;
  hasScreenshot: boolean;
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
  monthlyPriceInr: number;
  paymentRequests: PaymentRequestEntry[];
}

/** Admin's per-bucket user list (Trial/Active/Expired/Cancelled) on the Subscriptions page — separate from AdminUserSummary since that's the general Users page's shape. */
export interface SubscriptionUserSummary {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: number | null;
  subscriptionEndDate: number | null;
}

/** Payment request with the requesting user's identity attached — what the admin review list actually needs to display. */
export interface AdminPaymentRequestEntry extends PaymentRequestEntry {
  userName: string;
  userEmail: string;
}

/** Full detail for a single payment request, including the screenshot — fetched on demand, never in a list response. */
export interface PaymentRequestDetail extends AdminPaymentRequestEntry {
  screenshot: string | null;
}

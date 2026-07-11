import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import type { AdminPage } from './admin.service';
import type {
  AdminPaymentRequestEntry, PaymentRequestDetail, PaymentRequestStatus, SubscriptionStatus, SubscriptionUserSummary,
} from '@/types';

export const adminSubscriptionService = {
  async listPaymentRequests(status?: PaymentRequestStatus, page = 1, pageSize = 20): Promise<AdminPage<AdminPaymentRequestEntry>> {
    const { data } = await apiClient.get<AdminPage<AdminPaymentRequestEntry>>(ENDPOINTS.adminSubscriptions.paymentRequests, {
      params: { status, page, pageSize },
    });
    return data;
  },

  async getPaymentRequestDetail(id: string): Promise<PaymentRequestDetail> {
    const { data } = await apiClient.get<PaymentRequestDetail>(ENDPOINTS.adminSubscriptions.paymentRequestDetail(id));
    return data;
  },

  async approvePaymentRequest(id: string): Promise<void> {
    await apiClient.post(ENDPOINTS.adminSubscriptions.approve(id));
  },

  async rejectPaymentRequest(id: string, reason?: string): Promise<void> {
    await apiClient.post(ENDPOINTS.adminSubscriptions.reject(id), { reason });
  },

  async listUsersByBucket(bucket?: SubscriptionStatus, page = 1, pageSize = 20): Promise<AdminPage<SubscriptionUserSummary>> {
    const { data } = await apiClient.get<AdminPage<SubscriptionUserSummary>>(ENDPOINTS.adminSubscriptions.users, {
      params: { bucket, page, pageSize },
    });
    return data;
  },

  async activateSubscription(userId: string, days = 30): Promise<void> {
    await apiClient.post(ENDPOINTS.adminSubscriptions.activate(userId), { days });
  },

  async extendSubscription(userId: string, days: number): Promise<void> {
    await apiClient.post(ENDPOINTS.adminSubscriptions.extend(userId), { days });
  },

  async cancelSubscription(userId: string): Promise<void> {
    await apiClient.post(ENDPOINTS.adminSubscriptions.cancel(userId));
  },
};

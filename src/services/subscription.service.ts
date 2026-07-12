import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import type { PaymentRequestEntry, SubscriptionStatusResponse } from '@/types';

export const subscriptionService = {
  async getStatus(): Promise<SubscriptionStatusResponse> {
    const { data } = await apiClient.get<SubscriptionStatusResponse>(ENDPOINTS.subscription.status);
    return data;
  },

  async submitPaymentRequest(input: { planId: string; utr: string; screenshot?: string | null }): Promise<PaymentRequestEntry> {
    const { data } = await apiClient.post<PaymentRequestEntry>(ENDPOINTS.subscription.paymentRequest, input);
    return data;
  },
};

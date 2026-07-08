import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import { MOCK_AVAILABLE_BALANCE } from '@api/mockData';
import { portfolioService } from '@services/portfolio.service';
import type { AccountSummary } from '@/types';

const USE_MOCK = import.meta.env.VITE_ENABLE_MOCK_API === 'true';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const dashboardService = {
  async getAccountSummary(): Promise<AccountSummary> {
    if (USE_MOCK) {
      const portfolio = await portfolioService.getSummary();
      return delay({
        portfolioValue: portfolio.currentValue,
        todayPnL: portfolio.dayChange,
        todayPnLPercent: portfolio.dayChangePercent,
        totalInvestment: portfolio.totalInvested,
        availableBalance: MOCK_AVAILABLE_BALANCE,
      });
    }
    const { data } = await apiClient.get<AccountSummary>(ENDPOINTS.dashboard.accountSummary);
    return data;
  },
};

import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import {
  MOCK_AVAILABLE_BALANCE,
  MOCK_OPEN_ORDERS,
  MOCK_TRADES,
  MOCK_TRADING_SIGNALS,
  MOCK_AI_CONFIDENCE,
  getMostActiveStocks,
  generateEquityCurve,
  generatePortfolioGrowth,
  generateDailyPnL,
  getSectorAllocation,
} from '@api/mockData';
import { portfolioService } from '@services/portfolio.service';
import type {
  AccountSummary,
  Stock,
  OpenOrder,
  Trade,
  TradingSignal,
  AIConfidence,
  EquityPoint,
  GrowthPoint,
  DailyPnLPoint,
  SectorAllocation,
} from '@/types';

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

  async getMostActive(): Promise<Stock[]> {
    if (USE_MOCK) return delay(getMostActiveStocks());
    const { data } = await apiClient.get<Stock[]>(ENDPOINTS.dashboard.mostActive);
    return data;
  },

  async getOpenOrders(): Promise<OpenOrder[]> {
    if (USE_MOCK) return delay(MOCK_OPEN_ORDERS);
    const { data } = await apiClient.get<OpenOrder[]>(ENDPOINTS.dashboard.openOrders);
    return data;
  },

  async getRecentTrades(): Promise<Trade[]> {
    if (USE_MOCK) return delay(MOCK_TRADES);
    const { data } = await apiClient.get<Trade[]>(ENDPOINTS.dashboard.trades);
    return data;
  },

  async getTradingSignals(): Promise<TradingSignal[]> {
    if (USE_MOCK) return delay(MOCK_TRADING_SIGNALS);
    const { data } = await apiClient.get<TradingSignal[]>(ENDPOINTS.dashboard.signals);
    return data;
  },

  async getAIConfidence(): Promise<AIConfidence> {
    if (USE_MOCK) return delay(MOCK_AI_CONFIDENCE);
    const { data } = await apiClient.get<AIConfidence>(ENDPOINTS.dashboard.aiConfidence);
    return data;
  },

  async getEquityCurve(): Promise<EquityPoint[]> {
    if (USE_MOCK) return delay(generateEquityCurve());
    const { data } = await apiClient.get<EquityPoint[]>(ENDPOINTS.dashboard.equityCurve);
    return data;
  },

  async getPortfolioGrowth(): Promise<GrowthPoint[]> {
    if (USE_MOCK) return delay(generatePortfolioGrowth());
    const { data } = await apiClient.get<GrowthPoint[]>(ENDPOINTS.dashboard.portfolioGrowth);
    return data;
  },

  async getDailyPnL(): Promise<DailyPnLPoint[]> {
    if (USE_MOCK) return delay(generateDailyPnL());
    const { data } = await apiClient.get<DailyPnLPoint[]>(ENDPOINTS.dashboard.dailyPnl);
    return data;
  },

  async getSectorAllocation(): Promise<SectorAllocation[]> {
    if (USE_MOCK) return delay(getSectorAllocation());
    const { data } = await apiClient.get<SectorAllocation[]>(ENDPOINTS.dashboard.sectorAllocation);
    return data;
  },
};

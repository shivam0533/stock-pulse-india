import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import { MOCK_PORTFOLIO_HOLDINGS, MOCK_STOCKS } from '@api/mockData';
import type { PortfolioSummary, PortfolioHolding, NewsItem } from '@/types';

const USE_MOCK = import.meta.env.VITE_ENABLE_MOCK_API === 'true';

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function buildMockPortfolio(): PortfolioSummary {
  const holdings: PortfolioHolding[] = MOCK_PORTFOLIO_HOLDINGS.map((h) => {
    const stock = MOCK_STOCKS.find((s) => s.symbol === h.symbol)!;
    const invested = h.quantity * h.avgPrice;
    const currentValue = h.quantity * stock.price;
    const pnl = currentValue - invested;
    const pnlPercent = (pnl / invested) * 100;
    const dayChange = h.quantity * stock.change;
    const dayChangePercent = stock.changePercent;
    return {
      symbol: h.symbol,
      name: stock.name,
      quantity: h.quantity,
      avgPrice: h.avgPrice,
      currentPrice: stock.price,
      invested,
      currentValue,
      pnl,
      pnlPercent,
      dayChange,
      dayChangePercent,
    };
  });

  const totalInvested = holdings.reduce((a, h) => a + h.invested, 0);
  const currentValue = holdings.reduce((a, h) => a + h.currentValue, 0);
  const totalPnL = currentValue - totalInvested;
  const dayChange = holdings.reduce((a, h) => a + h.dayChange, 0);

  return {
    totalInvested,
    currentValue,
    totalPnL,
    totalPnLPercent: (totalPnL / totalInvested) * 100,
    dayChange,
    dayChangePercent: (dayChange / (currentValue - dayChange)) * 100,
    holdings,
  };
}

export const portfolioService = {
  async getSummary(): Promise<PortfolioSummary> {
    if (USE_MOCK) return delay(buildMockPortfolio());
    const { data } = await apiClient.get<PortfolioSummary>(ENDPOINTS.portfolio.summary);
    return data;
  },
};

// News service co-located - small enough
import { MOCK_NEWS } from '@api/mockData';

export const newsService = {
  async getFeed(): Promise<NewsItem[]> {
    if (USE_MOCK) return delay(MOCK_NEWS);
    const { data } = await apiClient.get<NewsItem[]>(ENDPOINTS.news.feed);
    return data;
  },

  async getByTicker(symbol: string): Promise<NewsItem[]> {
    if (USE_MOCK) {
      return delay(MOCK_NEWS.filter((n) => n.tickers.includes(symbol)));
    }
    const { data } = await apiClient.get<NewsItem[]>(ENDPOINTS.news.byTicker(symbol));
    return data;
  },
};

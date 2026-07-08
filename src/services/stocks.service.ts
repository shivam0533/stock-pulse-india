import { apiClient } from '@api/client';
import { ENDPOINTS } from '@api/endpoints';
import { MOCK_STOCKS, getStockHistory } from '@api/mockData';
import type { Stock, PricePoint, Timeframe } from '@/types';

const USE_MOCK = import.meta.env.VITE_ENABLE_MOCK_API === 'true';

const POINTS_BY_TIMEFRAME: Record<Timeframe, number> = {
  '1D': 78,    // 5-min intervals during market hours
  '1W': 35,
  '1M': 30,
  '3M': 90,
  '1Y': 252,   // Trading days in a year
  '5Y': 260,
};

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const stocksService = {
  async getBySymbol(symbol: string): Promise<Stock> {
    if (USE_MOCK) {
      const stock = MOCK_STOCKS.find((s) => s.symbol === symbol.toUpperCase());
      if (!stock) throw new Error(`Stock ${symbol} not found`);
      return delay(stock);
    }
    const { data } = await apiClient.get<Stock>(ENDPOINTS.stocks.detail(symbol));
    return data;
  },

  async getHistory(symbol: string, timeframe: Timeframe): Promise<PricePoint[]> {
    if (USE_MOCK) {
      return delay(getStockHistory(symbol, POINTS_BY_TIMEFRAME[timeframe]));
    }
    const { data } = await apiClient.get<PricePoint[]>(
      ENDPOINTS.stocks.history(symbol),
      { params: { timeframe } }
    );
    return data;
  },

  async search(query: string): Promise<Stock[]> {
    if (USE_MOCK) {
      const q = query.toLowerCase().trim();
      if (!q) return delay([]);
      return delay(
        MOCK_STOCKS.filter(
          (s) =>
            s.symbol.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
        ).slice(0, 8)
      );
    }
    const { data } = await apiClient.get<Stock[]>(ENDPOINTS.stocks.search, {
      params: { q: query },
    });
    return data;
  },

};

import { useQuery } from '@tanstack/react-query';
import { stocksService } from '@services/stocks.service';
import { QUERY_KEYS } from '@utils/constants';
import type { Timeframe } from '@/types';

export function useStocks() {
  return useQuery({
    queryKey: QUERY_KEYS.STOCKS,
    queryFn: () => stocksService.list(),
    staleTime: 30 * 1000, // 30s — market data
    refetchInterval: 60 * 1000, // poll every minute
  });
}

export function useStock(symbol: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.STOCK(symbol ?? ''),
    queryFn: () => stocksService.getBySymbol(symbol!),
    enabled: Boolean(symbol),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useStockHistory(symbol: string | undefined, timeframe: Timeframe) {
  return useQuery({
    queryKey: QUERY_KEYS.STOCK_HISTORY(symbol ?? '', timeframe),
    queryFn: () => stocksService.getHistory(symbol!, timeframe),
    enabled: Boolean(symbol),
    staleTime: 5 * 60 * 1000,
  });
}

export function useIndices() {
  return useQuery({
    queryKey: QUERY_KEYS.INDICES,
    queryFn: () => stocksService.getIndices(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useTopMovers() {
  return useQuery({
    queryKey: QUERY_KEYS.TOP_MOVERS,
    queryFn: () => stocksService.getTopMovers(),
    staleTime: 60 * 1000,
  });
}

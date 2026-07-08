import { useQuery } from '@tanstack/react-query';
import { stocksService } from '@services/stocks.service';
import { QUERY_KEYS } from '@utils/constants';
import type { Timeframe } from '@/types';

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


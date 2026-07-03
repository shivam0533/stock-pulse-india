import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@services/dashboard.service';
import { QUERY_KEYS } from '@utils/constants';

export function useAccountSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.ACCOUNT_SUMMARY,
    queryFn: () => dashboardService.getAccountSummary(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMostActive() {
  return useQuery({
    queryKey: QUERY_KEYS.MOST_ACTIVE,
    queryFn: () => dashboardService.getMostActive(),
    staleTime: 60 * 1000,
  });
}

export function useOpenOrders() {
  return useQuery({
    queryKey: QUERY_KEYS.OPEN_ORDERS,
    queryFn: () => dashboardService.getOpenOrders(),
    staleTime: 30 * 1000,
  });
}

export function useRecentTrades() {
  return useQuery({
    queryKey: QUERY_KEYS.RECENT_TRADES,
    queryFn: () => dashboardService.getRecentTrades(),
    staleTime: 30 * 1000,
  });
}

export function useTradingSignals() {
  return useQuery({
    queryKey: QUERY_KEYS.TRADING_SIGNALS,
    queryFn: () => dashboardService.getTradingSignals(),
    staleTime: 60 * 1000,
  });
}

export function useAIConfidence() {
  return useQuery({
    queryKey: QUERY_KEYS.AI_CONFIDENCE,
    queryFn: () => dashboardService.getAIConfidence(),
    staleTime: 60 * 1000,
  });
}

export function useEquityCurve() {
  return useQuery({
    queryKey: QUERY_KEYS.EQUITY_CURVE,
    queryFn: () => dashboardService.getEquityCurve(),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePortfolioGrowth() {
  return useQuery({
    queryKey: QUERY_KEYS.PORTFOLIO_GROWTH,
    queryFn: () => dashboardService.getPortfolioGrowth(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyPnL() {
  return useQuery({
    queryKey: QUERY_KEYS.DAILY_PNL,
    queryFn: () => dashboardService.getDailyPnL(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSectorAllocation() {
  return useQuery({
    queryKey: QUERY_KEYS.SECTOR_ALLOCATION,
    queryFn: () => dashboardService.getSectorAllocation(),
    staleTime: 5 * 60 * 1000,
  });
}

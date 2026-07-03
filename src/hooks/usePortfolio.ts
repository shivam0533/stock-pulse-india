import { useQuery } from '@tanstack/react-query';
import { portfolioService, newsService } from '@services/portfolio.service';
import { QUERY_KEYS } from '@utils/constants';

export function usePortfolio() {
  return useQuery({
    queryKey: QUERY_KEYS.PORTFOLIO,
    queryFn: () => portfolioService.getSummary(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useNews() {
  return useQuery({
    queryKey: QUERY_KEYS.NEWS,
    queryFn: () => newsService.getFeed(),
    staleTime: 5 * 60 * 1000,
  });
}

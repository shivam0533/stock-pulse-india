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

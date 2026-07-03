import { useQuery } from '@tanstack/react-query';
import { optionsService } from '@services/options.service';

export function useOptionChain(expiryIndex: number) {
  return useQuery({
    queryKey: ['option-chain', expiryIndex],
    queryFn: () => optionsService.getChain(expiryIndex),
    staleTime: 30 * 1000,
    refetchInterval: false, // manually controlled via auto-refresh
  });
}

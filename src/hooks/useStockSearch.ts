import { useQuery } from '@tanstack/react-query';
import { stocksService } from '@services/stocks.service';
import { useDebounce } from './useDebounce';

export function useStockSearch(query: string) {
  const debouncedQuery = useDebounce(query, 200);

  return useQuery({
    queryKey: ['stock-search', debouncedQuery],
    queryFn: () => stocksService.search(debouncedQuery),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 30 * 1000,
  });
}

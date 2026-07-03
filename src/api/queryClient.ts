import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        // Don't retry on auth or client errors
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      staleTime: 30 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

import { QueryClient } from '@tanstack/react-query';
import { getHttpStatus } from '@/services/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = getHttpStatus(error);
        if (status === 401 || status === 403) {
          return false;
        }

        return failureCount < 2;
      },
    },
  },
});

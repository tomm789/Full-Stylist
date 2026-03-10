import { QueryClient } from '@tanstack/react-query';

/** Keys that should NOT be persisted to AsyncStorage */
const NON_PERSISTABLE_KEYS = ['auth', 'notifications'];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (longer for persisted cache)
      retry: 1,
    },
    dehydrate: {
      shouldDehydrateQuery: (query) => {
        const key = query.queryKey[0] as string;
        return query.state.status === 'success' && !NON_PERSISTABLE_KEYS.includes(key);
      },
    },
  },
});

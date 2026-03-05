/**
 * useFeedbackThreads Hook
 * Load and filter feedback threads
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getFeedbackThreads, FeedbackThread, FeedbackThreadFilters } from '@/lib/feedback';

interface UseFeedbackThreadsProps {
  category?: 'bug' | 'feature' | 'general' | 'other' | 'all';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed' | 'all';
}

interface UseFeedbackThreadsReturn {
  threads: FeedbackThread[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useFeedbackThreads({
  category = 'all',
  status = 'all',
}: UseFeedbackThreadsProps): UseFeedbackThreadsReturn {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['feedbackThreads', category, status],
    queryFn: async () => {
      const filters: FeedbackThreadFilters = {};
      if (category !== 'all') {
        filters.category = category;
      }
      if (status !== 'all') {
        filters.status = status;
      }

      const { data } = await getFeedbackThreads(filters);
      return data ?? [];
    },
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['feedbackThreads', category, status] });
  }, [queryClient, category, status]);

  return {
    threads: data ?? [],
    loading: isLoading,
    refresh,
  };
}

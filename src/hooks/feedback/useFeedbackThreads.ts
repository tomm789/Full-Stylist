/**
 * useFeedbackThreads Hook
 * Load and filter feedback threads
 */

import { useState, useEffect } from 'react';
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
  const [threads, setThreads] = useState<FeedbackThread[]>([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = async () => {
    setLoading(true);

    const filters: FeedbackThreadFilters = {};
    if (category !== 'all') {
      filters.category = category;
    }
    if (status !== 'all') {
      filters.status = status;
    }

    const { data } = await getFeedbackThreads(filters);
    if (data) {
      setThreads(data);
    }

    setLoading(false);
  };

  const refresh = async () => {
    await loadThreads();
  };

  useEffect(() => {
    loadThreads();
  }, [category, status]);

  return {
    threads,
    loading,
    refresh,
  };
}

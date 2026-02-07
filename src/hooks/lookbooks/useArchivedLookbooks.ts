/**
 * useArchivedLookbooks Hook
 * Loads archived lookbooks for the user
 */

import { useEffect, useState, useCallback } from 'react';
import { getUserArchivedLookbooks, Lookbook } from '@/lib/lookbooks';

interface UseArchivedLookbooksProps {
  userId: string | undefined;
}

export function useArchivedLookbooks({ userId }: UseArchivedLookbooksProps) {
  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLookbooks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await getUserArchivedLookbooks(userId);
      setLookbooks(data || []);
    } catch (error) {
      console.error('Error loading archived lookbooks:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await loadLookbooks();
  }, [loadLookbooks]);

  useEffect(() => {
    loadLookbooks();
  }, [loadLookbooks]);

  return {
    lookbooks,
    loading,
    refresh,
  };
}

export default useArchivedLookbooks;

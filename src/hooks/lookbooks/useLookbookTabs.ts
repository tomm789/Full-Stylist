import { useCallback, useEffect, useState } from 'react';
import { getUserLookbooks } from '@/lib/lookbooks';

type PinnedLookbook = {
  id: string;
  title: string;
};

type UseLookbookTabsParams = {
  userId?: string;
};

export function useLookbookTabs({ userId }: UseLookbookTabsParams) {
  const [pinnedLookbooks, setPinnedLookbooks] = useState<PinnedLookbook[]>([]);
  const [availableLookbooks, setAvailableLookbooks] = useState<PinnedLookbook[]>([]);
  const [loadingLookbooks, setLoadingLookbooks] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoadingLookbooks(true);
      const { data } = await getUserLookbooks(userId);
      const manual = (data || [])
        .filter((lb: any) => lb.type === 'custom_manual')
        .map((lb: any) => ({ id: lb.id, title: lb.title || 'Untitled' }));
      setAvailableLookbooks(manual);
      setLoadingLookbooks(false);
    };

    load();
  }, [userId]);

  const addLookbookTab = useCallback((id: string, title: string) => {
    setPinnedLookbooks((prev) => {
      if (prev.some((lb) => lb.id === id)) return prev;
      return [...prev, { id, title }];
    });
  }, []);

  const removeLookbookTab = useCallback((id: string) => {
    setPinnedLookbooks((prev) => prev.filter((lb) => lb.id !== id));
  }, []);

  return {
    pinnedLookbooks,
    addLookbookTab,
    removeLookbookTab,
    availableLookbooks,
    loadingLookbooks,
  };
}

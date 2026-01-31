/**
 * useLookbookDetail Hook
 * Load and manage single lookbook with outfits
 */

import { useState, useEffect, useCallback } from 'react';
import { getLookbook, getSystemLookbookOutfits, Lookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';

interface UseLookbookDetailProps {
  lookbookId: string | undefined;
  userId: string | undefined;
}

interface UseLookbookDetailReturn {
  lookbook: Lookbook | null;
  outfits: any[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useLookbookDetail({
  lookbookId,
  userId,
}: UseLookbookDetailProps): UseLookbookDetailReturn {
  const [lookbook, setLookbook] = useState<Lookbook | null>(null);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLookbook = useCallback(async () => {
    if (!lookbookId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if this is a system lookbook
      if (lookbookId.startsWith('system-')) {
        const systemType = lookbookId.replace('system-', '') as
          | 'all'
          | 'favorites'
          | 'recent'
          | 'top';

        const systemTypeMap = {
          all: 'system_all',
          favorites: 'system_favorites',
          recent: 'system_recent',
          top: 'system_top',
        } as const;

        const titleMap = {
          all: 'All Outfits',
          favorites: 'Favorites',
          recent: 'Recent',
          top: 'Top Rated',
        };

        const virtualLookbook: Lookbook = {
          id: lookbookId,
          owner_user_id: 'system',
          title: titleMap[systemType],
          description: `Your ${titleMap[systemType].toLowerCase()} collection`,
          visibility: 'private',
          type: systemTypeMap[systemType],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setLookbook(virtualLookbook);

        const { data: systemOutfitsResult } = await getSystemLookbookOutfits(
          userId,
          systemTypeMap[systemType]
        );

        if (systemOutfitsResult) {
          const { data: allOutfits } = await getUserOutfits(userId);
          if (allOutfits) {
            const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
            const outfitsWithData = systemOutfitsResult
              .map((so) => outfitMap.get(so.outfit_id))
              .filter(Boolean);
            setOutfits(outfitsWithData);
          }
        }
      } else {
        const { data, error } = await getLookbook(lookbookId);

        if (!error && data) {
          setLookbook(data.lookbook);

          if (data.lookbook.type === 'custom_manual') {
            const { data: allOutfits } = await getUserOutfits(data.lookbook.owner_user_id);

            if (allOutfits) {
              const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
              const lookbookOutfits = data.outfits
                .map((lo: any) => outfitMap.get(lo.outfit_id))
                .filter(Boolean);

              setOutfits(lookbookOutfits);
            }
          } else {
            setOutfits([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading lookbook:', error);
    } finally {
      setLoading(false);
    }
  }, [lookbookId, userId]);

  const refresh = useCallback(async () => {
    await loadLookbook();
  }, [loadLookbook]);

  useEffect(() => {
    loadLookbook();
  }, [loadLookbook]);

  return {
    lookbook,
    outfits,
    loading,
    refresh,
  };
}

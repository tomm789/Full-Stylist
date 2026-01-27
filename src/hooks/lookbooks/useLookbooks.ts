/**
 * useLookbooks Hook
 * Manages user lookbooks with thumbnails
 */

import { useState, useEffect } from 'react';
import { getUserLookbooks, getLookbook, Lookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';

interface UseLookbooksProps {
  userId: string | undefined;
}

interface UseLookbooksReturn {
  lookbooks: Lookbook[];
  thumbnails: Map<string, string | null>;
  loading: boolean;
  loadingIds: Set<string>;
  refresh: () => Promise<void>;
}

export function useLookbooks({ userId }: UseLookbooksProps): UseLookbooksReturn {
  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [thumbnails, setThumbnails] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  const loadLookbooks = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data } = await getUserLookbooks(userId);
      if (data) {
        const customLookbooks = data.filter((lb) => lb.type.startsWith('custom_'));
        setLookbooks(customLookbooks);

        // Mark all as loading
        setLoadingIds(new Set(customLookbooks.map((lb) => lb.id)));

        // Load thumbnails for each lookbook
        const { data: allOutfits } = await getUserOutfits(userId);
        const thumbnailMap = new Map<string, string | null>();

        if (allOutfits) {
          const thumbnailPromises = customLookbooks.map(async (lookbook) => {
            if (lookbook.type === 'custom_manual') {
              const { data: lookbookData } = await getLookbook(lookbook.id);
              if (lookbookData && lookbookData.outfits.length > 0) {
                const firstOutfit = allOutfits.find(
                  (o: any) => o.id === lookbookData.outfits[0].outfit_id
                );
                if (firstOutfit) {
                  const imageUrl = await getOutfitCoverImageUrl(firstOutfit);
                  return { id: lookbook.id, url: imageUrl };
                }
              }
            }
            return null;
          });

          const results = await Promise.all(thumbnailPromises);
          results.forEach((result) => {
            if (result) {
              thumbnailMap.set(result.id, result.url);
            }
          });
        }

        setThumbnails(thumbnailMap);
        setLoadingIds(new Set());
      }
    } catch (error) {
      console.error('Error loading lookbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadLookbooks();
  };

  useEffect(() => {
    loadLookbooks();
  }, [userId]);

  return {
    lookbooks,
    thumbnails,
    loading,
    loadingIds,
    refresh,
  };
}

/**
 * useLookbooks Hook
 * Manages user lookbooks with thumbnails
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserLookbooks, getLookbook, Lookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';

interface UseLookbooksProps {
  userId: string | undefined;
}

interface LookbooksQueryData {
  lookbooks: Lookbook[];
  thumbnails: Map<string, string | null>;
}

interface UseLookbooksReturn {
  lookbooks: Lookbook[];
  thumbnails: Map<string, string | null>;
  loading: boolean;
  loadingIds: Set<string>;
  refresh: () => Promise<void>;
}

export function useLookbooks({ userId }: UseLookbooksProps): UseLookbooksReturn {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['lookbooks', userId] as const, [userId]);

  const { data, isLoading, isFetching } = useQuery<LookbooksQueryData>({
    queryKey,
    queryFn: async () => {
      const { data } = await getUserLookbooks(userId!);
      if (!data) return { lookbooks: [], thumbnails: new Map() };

      const customLookbooks = data.filter((lb) => lb.type.startsWith('custom_'));
      const thumbnailMap = new Map<string, string | null>();

      const { data: allOutfits } = await getUserOutfits(userId!);

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

      return { lookbooks: customLookbooks, thumbnails: thumbnailMap };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    lookbooks: data?.lookbooks ?? [],
    thumbnails: data?.thumbnails ?? new Map(),
    loading: isLoading,
    // While fetching, show which lookbooks are loading thumbnails
    loadingIds: isFetching && !isLoading
      ? new Set((data?.lookbooks ?? []).map((lb) => lb.id))
      : new Set(),
    refresh,
  };
}

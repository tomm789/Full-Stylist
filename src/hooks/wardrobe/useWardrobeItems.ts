/**
 * useWardrobeItems Hook
 * Manages wardrobe items loading, caching, and state
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getWardrobeItems,
  getSavedWardrobeItems,
  getWardrobeItemsImages,
  buildWardrobeItemsImageUrlCache,
  WardrobeItem,
} from '@/lib/wardrobe';
import { getEntityAttributesForItems } from '@/lib/attributes/entity-attributes';
import { getTagsForItems } from '@/lib/wardrobe/tags';
import { prefetchImages } from '@/lib/images';

interface UseWardrobeItemsOptions {
  wardrobeId: string | null;
  userId: string | null;
  categoryId?: string;
  searchQuery?: string;
  autoLoad?: boolean;
}

export interface WardrobeItemsState {
  items: WardrobeItem[];
  allItems: WardrobeItem[];
  imageCache: Map<string, string | null>;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
}

interface WardrobeItemsQueryData {
  allItems: WardrobeItem[];
  imageCache: Map<string, string | null>;
  entityAttributesMap: Map<string, any[]>;
  tagsMap: Map<string, Array<{ id: string; name: string }>>;
}

export function useWardrobeItems({
  wardrobeId,
  userId,
  categoryId,
  searchQuery,
  autoLoad = true,
}: UseWardrobeItemsOptions) {
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['wardrobeItems', wardrobeId, userId, categoryId, searchQuery] as const,
    [wardrobeId, userId, categoryId, searchQuery]
  );

  const { data, isLoading, isFetching, error: queryError, isFetched } = useQuery<WardrobeItemsQueryData>({
    queryKey,
    queryFn: async () => {
      const [
        { data: ownedItems, error: ownedError },
        { data: savedItems, error: savedError },
      ] = await Promise.all([
        getWardrobeItems(wardrobeId!, {
          category_id: categoryId,
          search: searchQuery,
        }),
        getSavedWardrobeItems(userId!, {
          category_id: categoryId,
          search: searchQuery,
        }),
      ]);

      if (ownedError || savedError) {
        throw ownedError || savedError;
      }

      const combinedItems = [
        ...(ownedItems || []),
        ...(savedItems || []),
      ];

      let newCache = new Map<string, string | null>();
      let entityAttrsMap: any = new Map();
      let tagsData: any = new Map();

      if (combinedItems.length > 0) {
        const itemIds = combinedItems.map(item => item.id);

        try {
          const [imagesResult, attrsResult, tagsResult] = await Promise.all([
            getWardrobeItemsImages(itemIds),
            getEntityAttributesForItems('wardrobe_item', itemIds),
            getTagsForItems('wardrobe_item', itemIds),
          ]);
          newCache = buildWardrobeItemsImageUrlCache(itemIds, imagesResult.data);
          entityAttrsMap = attrsResult.data;
          tagsData = tagsResult.data;
        } catch (imgErr) {
          console.error('Failed to load wardrobe item images/attributes:', imgErr);
        }
      }

      return {
        allItems: combinedItems,
        imageCache: newCache,
        entityAttributesMap: entityAttrsMap,
        tagsMap: tagsData,
      };
    },
    enabled: autoLoad && !!wardrobeId && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });

  // Prefetch off-screen wardrobe item images for smoother scrolling
  useEffect(() => {
    const cache = data?.imageCache;
    if (!cache || cache.size === 0) return;
    const urls = Array.from(cache.values()).slice(8);
    prefetchImages(urls);
  }, [data?.imageCache]);

  const loadItems = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    allItems: data?.allItems ?? [],
    imageCache: data?.imageCache ?? new Map<string, string | null>(),
    entityAttributesMap: data?.entityAttributesMap ?? new Map(),
    tagsMap: data?.tagsMap ?? new Map(),
    loading: isLoading,
    refreshing: isFetching && !isLoading,
    error: queryError as Error | null,
    hasLoaded: isFetched,
    loadItems,
    refresh,
  };
}

export default useWardrobeItems;

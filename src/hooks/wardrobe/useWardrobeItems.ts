/**
 * useWardrobeItems Hook
 * Manages wardrobe items loading, caching, and state
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getWardrobeItems,
  getSavedWardrobeItems,
  getWardrobeItemsImages,
  buildWardrobeItemsImageUrlCache,
  WardrobeItem,
} from '@/lib/wardrobe';
import { getEntityAttributesForItems } from '@/lib/attributes/entity-attributes';
import { getTagsForItems } from '@/lib/tags';

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

export function useWardrobeItems({
  wardrobeId,
  userId,
  categoryId,
  searchQuery,
  autoLoad = true,
}: UseWardrobeItemsOptions) {
  const [allItems, setAllItems] = useState<WardrobeItem[]>([]);
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());
  const [entityAttributesMap, setEntityAttributesMap] = useState<Map<string, any[]>>(new Map());
  const [tagsMap, setTagsMap] = useState<Map<string, Array<{ id: string; name: string }>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load items from API
  const loadItems = useCallback(async () => {
    if (!wardrobeId || !userId || loading) return;

    setLoading(true);
    setError(null);

    try {
      const [
        { data: ownedItems, error: ownedError },
        { data: savedItems, error: savedError },
      ] = await Promise.all([
        getWardrobeItems(wardrobeId, {
          category_id: categoryId,
          search: searchQuery,
        }),
        getSavedWardrobeItems(userId, {
          category_id: categoryId,
          search: searchQuery,
        }),
      ]);

      if (ownedError || savedError) {
        throw ownedError || savedError;
      }

      // Combine owned and saved items
      const combinedItems = [
        ...(ownedItems || []),
        ...(savedItems || []),
      ];

      // Batch load images, entity attributes, and tags before setting any state
      // so React 18 batches all updates into a single render (skeleton → loaded)
      if (combinedItems.length > 0) {
        const itemIds = combinedItems.map(item => item.id);

        let newCache = new Map<string, string | null>();
        let entityAttrsMap: any = new Map();
        let tagsData: any = new Map();

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

        // Set all state in one synchronous tick — React batches into one render
        setAllItems(combinedItems);
        setImageCache((prev) => {
          const merged = new Map(prev);
          for (const [id, url] of newCache.entries()) {
            merged.set(id, url);
          }
          return merged;
        });
        setEntityAttributesMap(entityAttrsMap);
        setTagsMap(tagsData);
      } else {
        setAllItems(combinedItems);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load wardrobe items:', err);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [wardrobeId, userId, categoryId, searchQuery]);

  // Refresh items (for pull-to-refresh)
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  // Auto-load on mount and when dependencies change
  useEffect(() => {
    if (autoLoad && wardrobeId && userId) {
      loadItems();
    }
  }, [autoLoad, wardrobeId, userId, categoryId, searchQuery]);

  return {
    allItems,
    imageCache,
    entityAttributesMap,
    tagsMap,
    loading,
    refreshing,
    error,
    hasLoaded,
    loadItems,
    refresh,
  };
}

export default useWardrobeItems;

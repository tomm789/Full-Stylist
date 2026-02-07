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

      setAllItems(combinedItems);

      // Batch load images, entity attributes, and tags in parallel
      if (combinedItems.length > 0) {
        const itemIds = combinedItems.map(item => item.id);

        const [
          { data: imagesMap },
          { data: entityAttrsMap },
          { data: tagsData },
        ] = await Promise.all([
          getWardrobeItemsImages(itemIds),
          getEntityAttributesForItems('wardrobe_item', itemIds),
          getTagsForItems('wardrobe_item', itemIds),
        ]);

        const newCache = buildWardrobeItemsImageUrlCache(itemIds, imagesMap);
        setImageCache(newCache);
        setEntityAttributesMap(entityAttrsMap);
        setTagsMap(tagsData);
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

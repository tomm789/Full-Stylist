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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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

      // Batch load images
      if (combinedItems.length > 0) {
        const itemIds = combinedItems.map(item => item.id);
        const { data: imagesMap } = await getWardrobeItemsImages(itemIds);

        const newCache = buildWardrobeItemsImageUrlCache(itemIds, imagesMap);
        setImageCache(newCache);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load wardrobe items:', err);
    } finally {
      setLoading(false);
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
    loading,
    refreshing,
    error,
    loadItems,
    refresh,
  };
}

export default useWardrobeItems;

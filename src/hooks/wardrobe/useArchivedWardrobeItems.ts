/**
 * useArchivedWardrobeItems Hook
 * Manages archived wardrobe items loading, caching, and state
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getArchivedWardrobeItems,
  getWardrobeItemsImages,
  buildWardrobeItemsImageUrlCache,
  WardrobeItem,
} from '@/lib/wardrobe';

interface UseArchivedWardrobeItemsOptions {
  wardrobeId: string | null;
  categoryId?: string;
  searchQuery?: string;
  autoLoad?: boolean;
}

export function useArchivedWardrobeItems({
  wardrobeId,
  categoryId,
  searchQuery,
  autoLoad = true,
}: UseArchivedWardrobeItemsOptions) {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadItems = useCallback(async () => {
    if (!wardrobeId || loading) return;
    setLoading(true);

    try {
      const { data, error } = await getArchivedWardrobeItems(wardrobeId, {
        category_id: categoryId,
        search: searchQuery,
      });

      if (error) {
        console.error('Failed to load archived wardrobe items:', error);
        return;
      }

      setItems(data || []);

      if (data && data.length > 0) {
        const itemIds = data.map((item) => item.id);
        const { data: imagesMap } = await getWardrobeItemsImages(itemIds);
        const newCache = buildWardrobeItemsImageUrlCache(itemIds, imagesMap);
        setImageCache(newCache);
      } else {
        setImageCache(new Map());
      }
    } catch (error) {
      console.error('Error loading archived wardrobe items:', error);
    } finally {
      setLoading(false);
    }
  }, [wardrobeId, categoryId, searchQuery, loading]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  useEffect(() => {
    if (autoLoad && wardrobeId) {
      loadItems();
    }
  }, [autoLoad, wardrobeId, categoryId, searchQuery, loadItems]);

  return {
    items,
    imageCache,
    loading,
    refreshing,
    refresh,
    loadItems,
  };
}

export default useArchivedWardrobeItems;

/**
 * useOutfits Hook
 * Manages outfit loading, caching, and refreshing
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserOutfitsWithOptions, OutfitWithRating } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';

interface UseOutfitsOptions {
  userId: string | null | undefined;
  searchQuery?: string;
  favoritesOnly?: boolean;
  sortBy?: 'date' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export function useOutfits({
  userId,
  searchQuery = '',
  favoritesOnly = false,
  sortBy = 'date',
  sortOrder = 'desc',
}: UseOutfitsOptions) {
  const [outfits, setOutfits] = useState<OutfitWithRating[]>([]);
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOutfits = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await getUserOutfitsWithOptions(userId, {
        search: searchQuery || undefined,
        favorites: favoritesOnly || undefined,
        sortBy,
        sortOrder,
      });

      if (error) {
        console.error('Failed to load outfits:', error);
        return;
      }

      setOutfits(data || []);

      // Load images in parallel
      const imageMap = new Map<string, string | null>();
      const loadPromises = (data || []).map(async (outfit) => {
        const url = await getOutfitCoverImageUrl(outfit);
        imageMap.set(outfit.id, url);
      });
      await Promise.all(loadPromises);
      setImageCache(imageMap);
    } catch (error) {
      console.error('Error loading outfits:', error);
    }
  }, [userId, searchQuery, favoritesOnly, sortBy, sortOrder]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadOutfits();
    setRefreshing(false);
  }, [loadOutfits]);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      loadOutfits().finally(() => setLoading(false));
    }
  }, [userId, loadOutfits]);

  return {
    outfits,
    imageCache,
    loading,
    refreshing,
    refresh,
    loadOutfits,
  };
}

export default useOutfits;

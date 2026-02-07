/**
 * useArchivedOutfits Hook
 * Manages archived outfit loading, caching, and refreshing
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserArchivedOutfitsWithOptions, OutfitWithRating } from '@/lib/outfits';
import { getOutfitCoverImages } from '@/lib/images';

interface UseArchivedOutfitsOptions {
  userId: string | null | undefined;
  searchQuery?: string;
  favoritesOnly?: boolean;
  sortBy?: 'date' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export function useArchivedOutfits({
  userId,
  searchQuery = '',
  favoritesOnly = false,
  sortBy = 'date',
  sortOrder = 'desc',
}: UseArchivedOutfitsOptions) {
  const [outfits, setOutfits] = useState<OutfitWithRating[]>([]);
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOutfits = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await getUserArchivedOutfitsWithOptions(userId, {
        search: searchQuery || undefined,
        favorites: favoritesOnly || undefined,
        sortBy,
        sortOrder,
      });

      if (error) {
        console.error('Failed to load archived outfits:', error);
        return;
      }

      setOutfits(data || []);

      // Single batched fetch for all cover images
      const imageMap = await getOutfitCoverImages(data || []);
      setImageCache(imageMap);
    } catch (error) {
      console.error('Error loading archived outfits:', error);
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

export default useArchivedOutfits;

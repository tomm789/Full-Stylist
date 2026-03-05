/**
 * useOutfits Hook
 * Manages outfit loading, caching, and refreshing
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { getUserOutfitsWithOptions, OutfitWithRating } from '@/lib/outfits';
import { getOutfitCoverImages } from '@/lib/images';

interface UseOutfitsOptions {
  userId: string | null | undefined;
  searchQuery?: string;
  favoritesOnly?: boolean;
  sortBy?: 'date' | 'rating' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface OutfitsQueryData {
  outfits: OutfitWithRating[];
  imageCache: Map<string, string | null>;
}

export function useOutfits({
  userId,
  searchQuery = '',
  favoritesOnly = false,
  sortBy = 'date',
  sortOrder = 'desc',
}: UseOutfitsOptions) {
  const queryClient = useQueryClient();

  const queryKey = useMemo(
    () => ['outfits', userId, searchQuery, favoritesOnly, sortBy, sortOrder] as const,
    [userId, searchQuery, favoritesOnly, sortBy, sortOrder]
  );

  const { data, isLoading, isFetching, isSuccess } = useQuery<OutfitsQueryData>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await getUserOutfitsWithOptions(userId!, {
        search: searchQuery || undefined,
        favorites: favoritesOnly || undefined,
        sortBy,
        sortOrder,
      });

      if (error) {
        console.error('Failed to load outfits:', error);
        return { outfits: [], imageCache: new Map() };
      }

      const outfitsData = data || [];
      let imageMap = new Map<string, string | null>();
      try {
        imageMap = await getOutfitCoverImages(outfitsData);
      } catch (imgErr) {
        console.error('Failed to load outfit cover images:', imgErr);
      }

      return { outfits: outfitsData, imageCache: imageMap };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: keepPreviousData,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loadOutfits = refresh;

  return {
    outfits: data?.outfits ?? [],
    imageCache: data?.imageCache ?? new Map<string, string | null>(),
    loading: isLoading,
    refreshing: isFetching && !isLoading,
    refresh,
    loadOutfits,
  };
}

export default useOutfits;

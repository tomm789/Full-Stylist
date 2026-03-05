/**
 * useUserOutfits Hook
 * Manages user outfits with cover images for calendar entries
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserOutfits } from '@/lib/outfits';
import { supabase } from '@/lib/supabase';

interface UseUserOutfitsProps {
  userId: string | undefined;
}

interface UseUserOutfitsReturn {
  outfits: any[];
  outfitImages: Map<string, string | null>;
  loading: boolean;
  refresh: () => Promise<void>;
}

async function fetchUserOutfits(userId: string) {
  const { data: userOutfits } = await getUserOutfits(userId);
  if (!userOutfits) return { outfits: [], outfitImages: new Map<string, string | null>() };

  const imagesMap = new Map<string, string | null>();
  const coverImageIds = userOutfits
    .map((outfit) => outfit.cover_image_id)
    .filter((id): id is string => Boolean(id));

  if (coverImageIds.length > 0) {
    try {
      const { data: coverImages } = await supabase
        .from('images')
        .select('id, storage_key, storage_bucket')
        .in('id', coverImageIds);

      const coverImageMap = new Map(
        (coverImages || []).map((image) => [image.id, image])
      );

      for (const outfit of userOutfits) {
        if (!outfit.cover_image_id) continue;
        const coverImage = coverImageMap.get(outfit.cover_image_id);
        if (!coverImage?.storage_key) continue;

        const storageBucket = coverImage.storage_bucket || 'media';
        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(coverImage.storage_key);

        if (urlData?.publicUrl) {
          imagesMap.set(outfit.id, urlData.publicUrl);
        }
      }
    } catch (imgErr) {
      console.error('Failed to load outfit images:', imgErr);
    }
  }

  return { outfits: userOutfits, outfitImages: imagesMap };
}

export function useUserOutfits({ userId }: UseUserOutfitsProps): UseUserOutfitsReturn {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['userOutfitsCalendar', userId],
    queryFn: () => fetchUserOutfits(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['userOutfitsCalendar', userId] });
  }, [queryClient, userId]);

  return {
    outfits: data?.outfits ?? [],
    outfitImages: data?.outfitImages ?? new Map(),
    loading: isLoading,
    refresh,
  };
}

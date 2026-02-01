/**
 * useUserOutfits Hook
 * Manages user outfits with cover images for calendar entries
 */

import { useState, useEffect } from 'react';
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

export function useUserOutfits({ userId }: UseUserOutfitsProps): UseUserOutfitsReturn {
  const [outfits, setOutfits] = useState<any[]>([]);
  const [outfitImages, setOutfitImages] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadOutfits = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: userOutfits } = await getUserOutfits(userId);
      if (userOutfits) {
        setOutfits(userOutfits);

        // Load outfit images
        const imagesMap = new Map<string, string | null>();
        const coverImageIds = userOutfits
          .map((outfit) => outfit.cover_image_id)
          .filter((id): id is string => Boolean(id));

        if (coverImageIds.length > 0) {
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
        }

        setOutfitImages(imagesMap);
      }
    } catch (error) {
      console.error('Error loading user outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadOutfits();
  };

  useEffect(() => {
    loadOutfits();
  }, [userId]);

  return {
    outfits,
    outfitImages,
    loading,
    refresh,
  };
}

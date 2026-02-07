/**
 * useDiscoverOutfits Hook
 * Load public outfits for the Explore grid
 */

import { useEffect, useState } from 'react';
import { FeedItem, Post } from '@/lib/posts';
import { getPublicOutfits } from '@/lib/outfits/core';
import { supabase } from '@/lib/supabase';

interface UseDiscoverOutfitsProps {
  limit?: number;
}

interface UseDiscoverOutfitsReturn {
  discoverOutfitFeed: FeedItem[];
  discoverOutfitImages: Map<string, string | null>;
  loading: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

async function batchGetOutfitCoverImages(
  outfits: Array<{ id: string; cover_image_id?: string | null }>
): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();

  const coverImageIds = outfits
    .map((o) => o.cover_image_id)
    .filter(Boolean) as string[];

  if (coverImageIds.length === 0) {
    outfits.forEach((o) => imageMap.set(o.id, null));
    return imageMap;
  }

  const { data: coverImages } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', coverImageIds);

  const coverImageLookup = new Map(
    (coverImages || []).map((img) => [img.id, img])
  );

  outfits.forEach((outfit) => {
    if (outfit.cover_image_id) {
      const img = coverImageLookup.get(outfit.cover_image_id);
      if (img?.storage_key) {
        const { data } = supabase.storage
          .from(img.storage_bucket || 'media')
          .getPublicUrl(img.storage_key);
        imageMap.set(outfit.id, data.publicUrl);
        return;
      }
    }
    imageMap.set(outfit.id, null);
  });

  return imageMap;
}

export function useDiscoverOutfits({
  limit = 60,
}: UseDiscoverOutfitsProps): UseDiscoverOutfitsReturn {
  const [discoverOutfitFeed, setDiscoverOutfitFeed] = useState<FeedItem[]>([]);
  const [discoverOutfitImages, setDiscoverOutfitImages] = useState<Map<string, string | null>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = async (offset: number = 0, append: boolean = false) => {
    if (!append) {
      setLoading(true);
    }

    try {
      const { data: outfits } = await getPublicOutfits(limit, offset);
      if (!outfits) {
        setLoading(false);
        return;
      }

      if (outfits.length < limit) {
        setHasMore(false);
      }

      const feedItems: FeedItem[] = outfits.map((outfit) => {
        const post: Post = {
          id: outfit.id,
          owner_user_id: outfit.owner_user_id,
          entity_type: 'outfit',
          entity_id: outfit.id,
          visibility: (outfit.visibility as Post['visibility']) || 'public',
          created_at: outfit.created_at,
        };

        return {
          id: outfit.id,
          type: 'post',
          post,
          owner: outfit.owner
            ? {
                id: outfit.owner.id || outfit.owner_user_id,
                handle: outfit.owner.handle,
                display_name: outfit.owner.display_name,
                avatar_url: outfit.owner.avatar_url ?? null,
              }
            : undefined,
          entity: {
            outfit,
          },
        };
      });

      const newFeed = append ? [...discoverOutfitFeed, ...feedItems] : feedItems;
      setDiscoverOutfitFeed(newFeed);

      const newImageCache = await batchGetOutfitCoverImages(outfits);

      if (append) {
        const mergedImages = new Map(discoverOutfitImages);
        newImageCache.forEach((url, id) => mergedImages.set(id, url));
        setDiscoverOutfitImages(mergedImages);
      } else {
        setDiscoverOutfitImages(newImageCache);
      }
    } catch (error) {
      console.error('Error loading discover outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setHasMore(true);
    await loadFeed(0, false);
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    await loadFeed(discoverOutfitFeed.length, true);
  };

  useEffect(() => {
    loadFeed();
  }, []);

  return {
    discoverOutfitFeed,
    discoverOutfitImages,
    loading,
    refresh,
    loadMore,
    hasMore,
  };
}

/**
 * useDiscoverFeed Hook
 * Load discover feed (public posts from all users) for the Discover tab
 * Uses the same batch image optimization as useFeed
 */

import { useState, useEffect } from 'react';
import { getDiscoverFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

interface UseDiscoverFeedProps {
  userId: string | undefined;
  limit?: number;
}

interface UseDiscoverFeedReturn {
  discoverFeed: FeedItem[];
  discoverImages: Map<string, string | null>;
  loading: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

// Batch get outfit cover images (same helper as useFeed)
async function batchGetOutfitCoverImages(
  outfits: Array<{ id: string; cover_image_id?: string }>
): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();

  const coverImageIds = outfits
    .map(o => o.cover_image_id)
    .filter(Boolean) as string[];

  if (coverImageIds.length === 0) {
    outfits.forEach(o => imageMap.set(o.id, null));
    return imageMap;
  }

  const { data: coverImages } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', coverImageIds);

  const coverImageLookup = new Map(
    (coverImages || []).map(img => [img.id, img])
  );

  outfits.forEach(outfit => {
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

export function useDiscoverFeed({
  userId,
  limit = 60,
}: UseDiscoverFeedProps): UseDiscoverFeedReturn {
  const [discoverFeed, setDiscoverFeed] = useState<FeedItem[]>([]);
  const [discoverImages, setDiscoverImages] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const loadFeed = async (offset: number = 0, append: boolean = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (!append) {
      setLoading(true);
    }

    try {
      const { data: feedItems } = await getDiscoverFeed(userId, limit, offset);
      if (!feedItems) {
        setLoading(false);
        return;
      }

      if (feedItems.length < limit) {
        setHasMore(false);
      }

      const newFeed = append ? [...discoverFeed, ...feedItems] : feedItems;
      setDiscoverFeed(newFeed);

      // Batch get outfit cover images for all items
      const outfitItems = feedItems.filter(item => {
        const post = item.post;
        return post?.entity_type === 'outfit' && item.entity?.outfit;
      });

      const outfits = outfitItems.map(item => item.entity!.outfit);
      const newImageCache = await batchGetOutfitCoverImages(outfits);

      // Also handle lookbook images (use first outfit image as cover)
      const lookbookItems = feedItems.filter(item => {
        const post = item.post;
        return post?.entity_type === 'lookbook' && item.entity?.lookbook;
      });

      // For lookbooks, we just show a placeholder for now in the grid
      lookbookItems.forEach(item => {
        const lookbook = item.entity!.lookbook;
        newImageCache.set(lookbook.id, null);
      });

      if (append) {
        const mergedImages = new Map(discoverImages);
        newImageCache.forEach((url, id) => mergedImages.set(id, url));
        setDiscoverImages(mergedImages);
      } else {
        setDiscoverImages(newImageCache);
      }
    } catch (error) {
      console.error('Error loading discover feed:', error);
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
    await loadFeed(discoverFeed.length, true);
  };

  useEffect(() => {
    loadFeed();
  }, [userId]);

  return {
    discoverFeed,
    discoverImages,
    loading,
    refresh,
    loadMore,
    hasMore,
  };
}

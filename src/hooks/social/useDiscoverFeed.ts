/**
 * useDiscoverFeed Hook
 * Load discover feed (public posts from all users) for the Discover tab
 * Uses the same batch image optimization as useFeed
 */

import { useState, useEffect } from 'react';
import { getDiscoverFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { batchGetOutfitCoverImages } from '@/utils/batchImageHelpers';

interface UseDiscoverFeedProps {
  userId: string | undefined;
  limit?: number;
}

interface UseDiscoverFeedReturn {
  discoverFeed: FeedItem[];
  discoverImages: Map<string, string | null>;
  headshotImages: Map<string, string | null>;
  loading: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useDiscoverFeed({
  userId,
  limit = 60,
}: UseDiscoverFeedProps): UseDiscoverFeedReturn {
  const [discoverFeed, setDiscoverFeed] = useState<FeedItem[]>([]);
  const [discoverImages, setDiscoverImages] = useState<Map<string, string | null>>(new Map());
  const [headshotImages, setHeadshotImages] = useState<Map<string, string | null>>(new Map());
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
      const newImageCache = await batchGetOutfitCoverImages(outfits, 'card');

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

      // Build headshot image URL map from entity data
      const newHeadshotCache = new Map<string, string | null>();
      feedItems.forEach(item => {
        if (item.post?.entity_type === 'headshot' && item.entity?.headshot) {
          const h = item.entity.headshot;
          if (h.storage_key) {
            const { data } = supabase.storage
              .from(h.storage_bucket || 'user-images')
              .getPublicUrl(h.storage_key);
            newHeadshotCache.set(h.id, data.publicUrl);
          } else {
            newHeadshotCache.set(h.id, null);
          }
        }
      });

      if (append) {
        const mergedHeadshots = new Map(headshotImages);
        newHeadshotCache.forEach((url, id) => mergedHeadshots.set(id, url));
        setHeadshotImages(mergedHeadshots);
      } else {
        setHeadshotImages(newHeadshotCache);
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
    headshotImages,
    loading,
    refresh,
    loadMore,
    hasMore,
  };
}

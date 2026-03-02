/**
 * useDiscoverOutfits Hook
 * Load public outfits for the Explore grid
 */

import { useEffect, useState } from 'react';
import { FeedItem, Post } from '@/lib/posts';
import { getPublicOutfits } from '@/lib/outfits/core';
import { batchGetOutfitCoverImages } from '@/utils/batchImageHelpers';

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

/**
 * useHeadshotDiscoverFeed Hook
 * Filters the discover/explore feed to headshot entity_type only.
 */

import { useState, useEffect, useCallback } from 'react';
import { getDiscoverFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

interface UseHeadshotDiscoverFeedProps {
  userId: string | undefined;
  limit?: number;
}

interface UseHeadshotDiscoverFeedReturn {
  feed: FeedItem[];
  headshotImages: Map<string, string | null>;
  loading: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useHeadshotDiscoverFeed({
  userId,
  limit = 60,
}: UseHeadshotDiscoverFeedProps): UseHeadshotDiscoverFeedReturn {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [headshotImages, setHeadshotImages] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadFeed = useCallback(async (currentOffset: number, append: boolean) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    if (!append) setLoading(true);

    try {
      // Fetch a larger batch so we get enough headshot posts after filtering
      const { data: allItems } = await getDiscoverFeed(userId, limit * 3, currentOffset, {
        includeCurrentUser: true,
      });
      const headshotItems = (allItems || []).filter(item => item.post?.entity_type === 'headshot');

      if ((allItems || []).length < limit * 3) {
        setHasMore(false);
      }

      const newFeed = append ? [...feed, ...headshotItems] : headshotItems;
      setFeed(newFeed);

      // Build image URL map for new items
      const newImageCache = new Map<string, string | null>();
      headshotItems.forEach(item => {
        const h = item.entity?.headshot;
        if (h?.storage_key) {
          const { data } = supabase.storage
            .from(h.storage_bucket || 'user-images')
            .getPublicUrl(h.storage_key);
          newImageCache.set(h.id, data.publicUrl);
        } else if (h) {
          newImageCache.set(h.id, null);
        }
      });

      if (append) {
        const merged = new Map(headshotImages);
        newImageCache.forEach((url, id) => merged.set(id, url));
        setHeadshotImages(merged);
      } else {
        setHeadshotImages(newImageCache);
      }

      setOffset(currentOffset + (allItems?.length || 0));
    } catch (error) {
      console.error('Error loading headshot discover feed:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  const refresh = useCallback(async () => {
    setHasMore(true);
    setOffset(0);
    await loadFeed(0, false);
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadFeed(offset, true);
  }, [hasMore, loading, offset, loadFeed]);

  useEffect(() => {
    loadFeed(0, false);
  }, [userId]);

  return { feed, headshotImages, loading, refresh, loadMore, hasMore };
}

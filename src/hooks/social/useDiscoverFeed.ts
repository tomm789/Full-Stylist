/**
 * useDiscoverFeed Hook
 * Load discover feed (public posts from all users) for the Discover tab
 * Uses React Query for initial load caching + local state for pagination
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDiscoverFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { getOutfitCoverImages } from '@/lib/images';

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

interface DiscoverPageData {
  items: FeedItem[];
  images: Map<string, string | null>;
  headshots: Map<string, string | null>;
}

async function fetchDiscoverPage(
  userId: string,
  limit: number,
  offset: number
): Promise<DiscoverPageData> {
  const { data: feedItems } = await getDiscoverFeed(userId, limit, offset);
  if (!feedItems) {
    return { items: [], images: new Map(), headshots: new Map() };
  }

  // Batch get outfit cover images
  const outfitItems = feedItems.filter(item => {
    const post = item.post;
    return post?.entity_type === 'outfit' && item.entity?.outfit;
  });
  const outfits = outfitItems.map(item => item.entity!.outfit);
  let newImageCache = new Map<string, string | null>();
  try {
    newImageCache = await getOutfitCoverImages(outfits, 'card');
  } catch (imgErr) {
    console.error('Failed to load discover images:', imgErr);
  }

  // Lookbook placeholders
  const lookbookItems = feedItems.filter(item => {
    const post = item.post;
    return post?.entity_type === 'lookbook' && item.entity?.lookbook;
  });
  lookbookItems.forEach(item => {
    const lookbook = item.entity!.lookbook;
    newImageCache.set(lookbook.id, null);
  });

  // Build headshot image URL map (sync)
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

  return { items: feedItems, images: newImageCache, headshots: newHeadshotCache };
}

export function useDiscoverFeed({
  userId,
  limit = 60,
}: UseDiscoverFeedProps): UseDiscoverFeedReturn {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['discoverFeed', userId] as const, [userId]);

  // Additional pages loaded via loadMore
  const [additionalItems, setAdditionalItems] = useState<FeedItem[]>([]);
  const [additionalImages, setAdditionalImages] = useState<Map<string, string | null>>(new Map());
  const [additionalHeadshots, setAdditionalHeadshots] = useState<Map<string, string | null>>(new Map());
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Initial page via React Query (cached across navigations)
  const { data, isLoading } = useQuery<DiscoverPageData>({
    queryKey,
    queryFn: async () => {
      const result = await fetchDiscoverPage(userId!, limit, 0);
      if (result.items.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      return result;
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 60 seconds
  });

  const refresh = useCallback(async () => {
    setAdditionalItems([]);
    setAdditionalImages(new Map());
    setAdditionalHeadshots(new Map());
    setHasMore(true);
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || loadingMore || !userId) return;

    setLoadingMore(true);
    try {
      const currentTotal = (data?.items.length ?? 0) + additionalItems.length;
      const pageData = await fetchDiscoverPage(userId, limit, currentTotal);

      if (pageData.items.length < limit) {
        setHasMore(false);
      }

      setAdditionalItems(prev => [...prev, ...pageData.items]);
      setAdditionalImages(prev => {
        const merged = new Map(prev);
        pageData.images.forEach((url, id) => merged.set(id, url));
        return merged;
      });
      setAdditionalHeadshots(prev => {
        const merged = new Map(prev);
        pageData.headshots.forEach((url, id) => merged.set(id, url));
        return merged;
      });
    } catch (error) {
      console.error('Error loading more discover feed:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, isLoading, loadingMore, userId, data?.items.length, additionalItems.length, limit]);

  // Merge initial query data with additional pages
  const discoverFeed = useMemo(
    () => [...(data?.items ?? []), ...additionalItems],
    [data?.items, additionalItems]
  );

  const discoverImages = useMemo(() => {
    if (additionalImages.size === 0) return data?.images ?? new Map();
    const merged = new Map(data?.images ?? new Map());
    additionalImages.forEach((url, id) => merged.set(id, url));
    return merged;
  }, [data?.images, additionalImages]);

  const headshotImages = useMemo(() => {
    if (additionalHeadshots.size === 0) return data?.headshots ?? new Map();
    const merged = new Map(data?.headshots ?? new Map());
    additionalHeadshots.forEach((url, id) => merged.set(id, url));
    return merged;
  }, [data?.headshots, additionalHeadshots]);

  return {
    discoverFeed,
    discoverImages,
    headshotImages,
    loading: isLoading,
    refresh,
    loadMore,
    hasMore,
  };
}

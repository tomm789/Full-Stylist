/**
 * useFeed Hook (OPTIMIZED)
 * Load and cache feed items with images and engagement counts
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { getLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { isFollowing } from '@/lib/user';
import { getRepostCount, hasReposted } from '@/lib/engagement/reposts';
import { getOutfitCoverImages } from '@/lib/images';

import type { EngagementCounts } from '@/hooks/engagement';

interface UseFeedProps {
  userId: string | undefined;
  filterByUserId?: string;
  limit?: number;
}

interface UseFeedReturn {
  feed: FeedItem[];
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, any>;
  headshotImages: Map<string, string | null>;
  engagementCounts: Record<string, EngagementCounts>;
  setEngagementCounts: React.Dispatch<React.SetStateAction<Record<string, EngagementCounts>>>;
  followStatuses: Map<string, boolean>;
  loading: boolean;
  refresh: () => Promise<void>;
}

// Batch get engagement counts in ONE query
async function batchGetEngagementCounts(
  postIds: string[],
  userId: string
): Promise<Record<string, Omit<EngagementCounts, 'reposts' | 'hasReposted'>>> {
  if (postIds.length === 0) return {};

  const [
    { data: likesData },
    { data: savesData },
    { data: commentsData },
    { data: userLikes },
    { data: userSaves },
  ] = await Promise.all([
    supabase
      .from('likes')
      .select('entity_id')
      .eq('entity_type', 'post')
      .in('entity_id', postIds),
    supabase
      .from('saves')
      .select('entity_id')
      .eq('entity_type', 'post')
      .in('entity_id', postIds),
    supabase
      .from('comments')
      .select('entity_id')
      .eq('entity_type', 'post')
      .in('entity_id', postIds),
    supabase
      .from('likes')
      .select('entity_id')
      .eq('entity_type', 'post')
      .eq('user_id', userId)
      .in('entity_id', postIds),
    supabase
      .from('saves')
      .select('entity_id')
      .eq('entity_type', 'post')
      .eq('user_id', userId)
      .in('entity_id', postIds),
  ]);

  const likeCounts = new Map<string, number>();
  const saveCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const userLikedSet = new Set(userLikes?.map(l => l.entity_id) || []);
  const userSavedSet = new Set(userSaves?.map(s => s.entity_id) || []);

  (likesData || []).forEach(({ entity_id }) => {
    likeCounts.set(entity_id, (likeCounts.get(entity_id) || 0) + 1);
  });
  (savesData || []).forEach(({ entity_id }) => {
    saveCounts.set(entity_id, (saveCounts.get(entity_id) || 0) + 1);
  });
  (commentsData || []).forEach(({ entity_id }) => {
    commentCounts.set(entity_id, (commentCounts.get(entity_id) || 0) + 1);
  });

  const result: Record<string, Omit<EngagementCounts, 'reposts' | 'hasReposted'>> = {};
  postIds.forEach(postId => {
    result[postId] = {
      likes: likeCounts.get(postId) || 0,
      saves: saveCounts.get(postId) || 0,
      comments: commentCounts.get(postId) || 0,
      hasLiked: userLikedSet.has(postId),
      hasSaved: userSavedSet.has(postId),
    };
  });

  return result;
}

interface FeedQueryData {
  feed: FeedItem[];
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, any>;
  headshotImages: Map<string, string | null>;
  engagementCounts: Record<string, EngagementCounts>;
  followStatuses: Map<string, boolean>;
}

export function useFeed({
  userId,
  filterByUserId,
  limit = 50,
}: UseFeedProps): UseFeedReturn {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['feed', userId, filterByUserId, limit] as const,
    [userId, filterByUserId, limit]
  );

  // Local state for optimistic engagement updates
  const [engagementOverrides, setEngagementOverrides] = useState<Record<string, EngagementCounts>>({});

  const { data, isLoading } = useQuery<FeedQueryData>({
    queryKey,
    queryFn: async () => {
      const { data: feedItems } = await getFeed(userId!, limit, 0);
      if (!feedItems) {
        return {
          feed: [],
          outfitImages: new Map(),
          lookbookImages: new Map(),
          headshotImages: new Map(),
          engagementCounts: {},
          followStatuses: new Map(),
        };
      }

      const filteredFeed = filterByUserId
        ? feedItems.filter((item) => {
            const post = item.type === 'post' ? item.post : item.repost?.original_post;
            return post?.owner_user_id === filterByUserId;
          })
        : feedItems;

      // Extract all post IDs and owner IDs
      const postIds: string[] = [];
      const ownerIds = new Set<string>();

      filteredFeed.forEach(item => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        if (post) {
          postIds.push(post.id);
          if (post.owner_user_id !== userId) {
            ownerIds.add(post.owner_user_id);
          }
        }
      });

      // Batch load engagement, reposts, follows in parallel
      const [
        engagementData,
        repostData,
        userRepostData,
        followData,
      ] = await Promise.all([
        batchGetEngagementCounts(postIds, userId!),
        Promise.all(postIds.map(async (postId) => ({
          postId,
          count: await getRepostCount(postId),
        }))),
        Promise.all(postIds.map(async (postId) => ({
          postId,
          hasReposted: await hasReposted(userId!, postId),
        }))),
        Promise.all(
          Array.from(ownerIds).map(async (ownerId) => ({
            ownerId,
            following: (await isFollowing(userId!, ownerId)).isFollowing,
          }))
        ),
      ]);

      // Process engagement counts
      const localCounts: Record<string, EngagementCounts> = {};
      const repostMap = new Map(repostData.map(r => [r.postId, r.count]));
      const userRepostMap = new Map(userRepostData.map(r => [r.postId, r.hasReposted]));
      postIds.forEach(postId => {
        localCounts[postId] = {
          ...engagementData[postId],
          reposts: repostMap.get(postId) || 0,
          hasReposted: userRepostMap.get(postId) || false,
        };
      });

      const localFollowStatuses = new Map(
        followData.map(f => [f.ownerId, f.following])
      );

      // Batch get outfit images
      const outfitItems = filteredFeed
        .filter(item => {
          const post = item.type === 'post' ? item.post : item.repost?.original_post;
          return post?.entity_type === 'outfit' && item.entity?.outfit;
        });
      const outfits = outfitItems.map(item => item.entity!.outfit);
      let localOutfitImages = new Map<string, string | null>();
      try {
        localOutfitImages = await getOutfitCoverImages(outfits, 'card');
      } catch (imgErr) {
        console.error('Failed to load outfit images:', imgErr);
      }

      // Handle lookbooks
      const localLookbookImages = new Map<string, any>();
      const lookbookItems = filteredFeed.filter(item => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        return post?.entity_type === 'lookbook' && item.entity?.lookbook;
      });

      await Promise.all(
        lookbookItems.map(async (item) => {
          const lookbookId = item.entity!.lookbook.id;
          const { data } = await getLookbook(lookbookId);

          if (data && data.outfits.length > 0) {
            const lookbookOwnerId = data.lookbook.owner_user_id;
            const { data: allOutfits } = await getUserOutfits(lookbookOwnerId);

            if (allOutfits) {
              const lookbookOutfits = data.outfits
                .map((lo: any) => allOutfits.find((o: any) => o.id === lo.outfit_id))
                .filter(Boolean);

              localLookbookImages.set(`${lookbookId}_outfits`, lookbookOutfits);

              const imageUrls = await getOutfitCoverImages(lookbookOutfits, 'card');

              if (lookbookOutfits.length > 0) {
                const firstUrl = imageUrls.get(lookbookOutfits[0].id);
                localLookbookImages.set(lookbookId, firstUrl);
              }

              imageUrls.forEach((url, outfitId) => {
                localLookbookImages.set(`${lookbookId}_outfit_${outfitId}`, url);
              });
            } else {
              localLookbookImages.set(lookbookId, null);
            }
          } else {
            localLookbookImages.set(lookbookId, null);
          }
        })
      );

      // Build headshot image URL map (sync)
      const localHeadshotImages = new Map<string, string | null>();
      filteredFeed.forEach(item => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        if (post?.entity_type === 'headshot' && item.entity?.headshot) {
          const h = item.entity.headshot;
          if (h.storage_key) {
            const { data } = supabase.storage
              .from(h.storage_bucket || 'user-images')
              .getPublicUrl(h.storage_key);
            localHeadshotImages.set(h.id, data.publicUrl);
          } else {
            localHeadshotImages.set(h.id, null);
          }
        }
      });

      return {
        feed: filteredFeed,
        outfitImages: localOutfitImages,
        lookbookImages: localLookbookImages,
        headshotImages: localHeadshotImages,
        engagementCounts: localCounts,
        followStatuses: localFollowStatuses,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60, // 60 seconds
  });

  // Clear overrides when query data refreshes
  useEffect(() => {
    if (data) {
      setEngagementOverrides({});
    }
  }, [data]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Merge query engagement counts with optimistic overrides
  const mergedEngagement = useMemo(() => {
    const base = data?.engagementCounts ?? {};
    if (Object.keys(engagementOverrides).length === 0) return base;
    return { ...base, ...engagementOverrides };
  }, [data?.engagementCounts, engagementOverrides]);

  // setEngagementCounts updates overrides for optimistic UI
  const setEngagementCounts: React.Dispatch<React.SetStateAction<Record<string, EngagementCounts>>> = useCallback(
    (action) => {
      setEngagementOverrides((prev) => {
        const base = data?.engagementCounts ?? {};
        const current = { ...base, ...prev };
        const next = typeof action === 'function' ? action(current) : action;
        return next;
      });
    },
    [data?.engagementCounts]
  );

  // Stable empty fallbacks to avoid creating new references each render
  const emptyFeed = useRef<FeedItem[]>([]).current;
  const emptyMap = useRef(new Map()).current;

  return {
    feed: data?.feed ?? emptyFeed,
    outfitImages: data?.outfitImages ?? emptyMap,
    lookbookImages: data?.lookbookImages ?? emptyMap,
    headshotImages: data?.headshotImages ?? emptyMap,
    engagementCounts: mergedEngagement,
    setEngagementCounts,
    followStatuses: data?.followStatuses ?? emptyMap,
    loading: isLoading,
    refresh,
  };
}

export type { EngagementCounts } from '@/hooks/engagement';

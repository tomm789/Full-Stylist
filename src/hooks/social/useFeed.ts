/**
 * useFeed Hook (OPTIMIZED)
 * Load and cache feed items with images and engagement counts
 */

import React, { useState, useEffect } from 'react';
import { getFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { getLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { isFollowing } from '@/lib/user';
import { getRepostCount, hasReposted } from '@/lib/reposts';
import { batchGetOutfitCoverImages } from '@/utils/batchImageHelpers';

interface EngagementCounts {
  likes: number;
  saves: number;
  comments: number;
  reposts: number;
  hasLiked: boolean;
  hasSaved: boolean;
  hasReposted: boolean;
}

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

// 🔥 OPTIMIZATION: Batch get engagement counts in ONE query
async function batchGetEngagementCounts(
  postIds: string[],
  userId: string
): Promise<Record<string, Omit<EngagementCounts, 'reposts' | 'hasReposted'>>> {
  if (postIds.length === 0) return {};

  // 🔥 Single query to get all likes, saves, and user interactions
  const [
    { data: likesData },
    { data: savesData },
    { data: commentsData },
    { data: userLikes },
    { data: userSaves },
  ] = await Promise.all([
    // Get all likes grouped by post
    supabase
      .from('likes')
      .select('entity_id')
      .eq('entity_type', 'post')
      .in('entity_id', postIds),
    
    // Get all saves grouped by post
    supabase
      .from('saves')
      .select('entity_id')
      .eq('entity_type', 'post')
      .in('entity_id', postIds),
    
    // Get all comments grouped by post
    supabase
      .from('comments')
      .select('entity_id')
      .eq('entity_type', 'post')
      .in('entity_id', postIds),
    
    // Get user's likes
    supabase
      .from('likes')
      .select('entity_id')
      .eq('entity_type', 'post')
      .eq('user_id', userId)
      .in('entity_id', postIds),
    
    // Get user's saves
    supabase
      .from('saves')
      .select('entity_id')
      .eq('entity_type', 'post')
      .eq('user_id', userId)
      .in('entity_id', postIds),
  ]);

  // Count occurrences
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

  // Build result
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

export function useFeed({
  userId,
  filterByUserId,
  limit = 50,
}: UseFeedProps): UseFeedReturn {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [outfitImages, setOutfitImages] = useState<Map<string, string | null>>(new Map());
  const [lookbookImages, setLookbookImages] = useState<Map<string, any>>(new Map());
  const [headshotImages, setHeadshotImages] = useState<Map<string, string | null>>(new Map());
  const [engagementCounts, setEngagementCounts] = useState<Record<string, EngagementCounts>>({});
  const [followStatuses, setFollowStatuses] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadFeed = async (cancelledRef?: { current: boolean }) => {
    const isCancelled = () => cancelledRef?.current === true;

    if (!userId) {
      if (!isCancelled()) {
        setLoading(false);
      }
      return;
    }

    if (!isCancelled()) {
      setLoading(true);
    }

    try {
      const { data: feedItems } = await getFeed(userId, limit, 0);
      if (isCancelled()) return;
      if (!feedItems) {
        if (!isCancelled()) {
          setLoading(false);
        }
        return;
      }

      // Filter by user if specified
      const filteredFeed = filterByUserId
        ? feedItems.filter((item) => {
            const post = item.type === 'post' ? item.post : item.repost?.original_post;
            return post?.owner_user_id === filterByUserId;
          })
        : feedItems;

      if (isCancelled()) return;

      // Collect all data into locals before setting any state
      // so React 18 batches all updates into a single render

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
        batchGetEngagementCounts(postIds, userId),
        Promise.all(postIds.map(async (postId) => ({
          postId,
          count: await getRepostCount(postId),
        }))),
        Promise.all(postIds.map(async (postId) => ({
          postId,
          hasReposted: await hasReposted(userId, postId),
        }))),
        Promise.all(
          Array.from(ownerIds).map(async (ownerId) => ({
            ownerId,
            following: (await isFollowing(userId, ownerId)).isFollowing,
          }))
        ),
      ]);
      if (isCancelled()) return;

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
        localOutfitImages = await batchGetOutfitCoverImages(outfits, 'card');
      } catch (imgErr) {
        console.error('Failed to load outfit images:', imgErr);
      }
      if (isCancelled()) return;

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

              const imageUrls = await batchGetOutfitCoverImages(lookbookOutfits, 'card');

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
      if (isCancelled()) return;

      // Build headshot image URL map (sync — no async needed)
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

      // Set ALL state in one synchronous tick — React batches into one render
      if (!isCancelled()) {
        setFeed(filteredFeed);
        setEngagementCounts(localCounts);
        setFollowStatuses(localFollowStatuses);
        setOutfitImages(localOutfitImages);
        setLookbookImages(localLookbookImages);
        setHeadshotImages(localHeadshotImages);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  };

  const refresh = async () => {
    await loadFeed();
  };

  useEffect(() => {
    const cancelledRef = { current: false };
    void loadFeed(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [userId, filterByUserId, limit]);

  return {
    feed,
    outfitImages,
    lookbookImages,
    headshotImages,
    engagementCounts,
    setEngagementCounts,
    followStatuses,
    loading,
    refresh,
  };
}

export type { EngagementCounts };

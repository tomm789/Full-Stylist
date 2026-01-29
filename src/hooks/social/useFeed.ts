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
  engagementCounts: Record<string, EngagementCounts>;
  setEngagementCounts: React.Dispatch<React.SetStateAction<Record<string, EngagementCounts>>>;
  followStatuses: Map<string, boolean>;
  loading: boolean;
  refresh: () => Promise<void>;
}

// 🔥 OPTIMIZATION: Batch get outfit cover images
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
  const [engagementCounts, setEngagementCounts] = useState<Record<string, EngagementCounts>>({});
  const [followStatuses, setFollowStatuses] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadFeed = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: feedItems } = await getFeed(userId, limit, 0);
      if (!feedItems) {
        setLoading(false);
        return;
      }

      // Filter by user if specified
      const filteredFeed = filterByUserId
        ? feedItems.filter((item) => {
            const post = item.type === 'post' ? item.post : item.repost?.original_post;
            return post?.owner_user_id === filterByUserId;
          })
        : feedItems;

      setFeed(filteredFeed);

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

      // 🔥 OPTIMIZATION: Batch load everything in parallel
      const [
        engagementData,
        repostData,
        userRepostData,
        followData,
      ] = await Promise.all([
        // Batch get engagement counts (1 query instead of 5*N queries!)
        batchGetEngagementCounts(postIds, userId),
        
        // Get all repost counts
        Promise.all(postIds.map(async (postId) => ({
          postId,
          count: await getRepostCount(postId),
        }))),
        
        // Get user's reposts
        Promise.all(postIds.map(async (postId) => ({
          postId,
          hasReposted: await hasReposted(userId, postId),
        }))),
        
        // Get follow statuses
        Promise.all(
          Array.from(ownerIds).map(async (ownerId) => ({
            ownerId,
            following: (await isFollowing(userId, ownerId)).isFollowing,
          }))
        ),
      ]);

      // Combine engagement data with reposts
      const counts: Record<string, EngagementCounts> = {};
      const repostMap = new Map(repostData.map(r => [r.postId, r.count]));
      const userRepostMap = new Map(userRepostData.map(r => [r.postId, r.hasReposted]));

      postIds.forEach(postId => {
        counts[postId] = {
          ...engagementData[postId],
          reposts: repostMap.get(postId) || 0,
          hasReposted: userRepostMap.get(postId) || false,
        };
      });

      setEngagementCounts(counts);

      // Set follow statuses
      const followStatusMap = new Map(
        followData.map(f => [f.ownerId, f.following])
      );
      setFollowStatuses(followStatusMap);

      // 🔥 OPTIMIZATION: Batch get outfit images
      const outfitItems = filteredFeed
        .filter(item => {
          const post = item.type === 'post' ? item.post : item.repost?.original_post;
          return post?.entity_type === 'outfit' && item.entity?.outfit;
        });

      const outfits = outfitItems.map(item => item.entity!.outfit);
      const outfitImageCache = await batchGetOutfitCoverImages(outfits);
      setOutfitImages(outfitImageCache);

      // Handle lookbooks (this is already relatively optimized)
      const lookbookImageCache = new Map<string, any>();
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

              lookbookImageCache.set(`${lookbookId}_outfits`, lookbookOutfits);

              const imageUrls = await batchGetOutfitCoverImages(lookbookOutfits);
              
              if (lookbookOutfits.length > 0) {
                const firstUrl = imageUrls.get(lookbookOutfits[0].id);
                lookbookImageCache.set(lookbookId, firstUrl);
              }

              imageUrls.forEach((url, outfitId) => {
                lookbookImageCache.set(`${lookbookId}_outfit_${outfitId}`, url);
              });
            } else {
              lookbookImageCache.set(lookbookId, null);
            }
          } else {
            lookbookImageCache.set(lookbookId, null);
          }
        })
      );

      setLookbookImages(lookbookImageCache);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadFeed();
  };

  useEffect(() => {
    loadFeed();
  }, [userId, filterByUserId, limit]);

  return {
    feed,
    outfitImages,
    lookbookImages,
    engagementCounts,
    setEngagementCounts,
    followStatuses,
    loading,
    refresh,
  };
}

export type { EngagementCounts };
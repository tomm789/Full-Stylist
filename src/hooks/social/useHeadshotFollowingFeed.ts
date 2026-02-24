/**
 * useHeadshotFollowingFeed Hook
 * Filters the following feed to headshot entity_type only.
 */

import { useState, useEffect, useCallback } from 'react';
import { getFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
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

interface UseHeadshotFollowingFeedProps {
  userId: string | undefined;
  limit?: number;
}

interface UseHeadshotFollowingFeedReturn {
  feed: FeedItem[];
  headshotImages: Map<string, string | null>;
  engagementCounts: Record<string, EngagementCounts>;
  setEngagementCounts: React.Dispatch<React.SetStateAction<Record<string, EngagementCounts>>>;
  loading: boolean;
  refresh: () => Promise<void>;
}

async function batchGetEngagement(
  postIds: string[],
  userId: string
): Promise<Record<string, EngagementCounts>> {
  if (postIds.length === 0) return {};

  const [
    { data: likesData },
    { data: savesData },
    { data: commentsData },
    { data: userLikes },
    { data: userSaves },
  ] = await Promise.all([
    supabase.from('likes').select('entity_id').eq('entity_type', 'post').in('entity_id', postIds),
    supabase.from('saves').select('entity_id').eq('entity_type', 'post').in('entity_id', postIds),
    supabase.from('comments').select('entity_id').eq('entity_type', 'post').in('entity_id', postIds),
    supabase.from('likes').select('entity_id').eq('entity_type', 'post').eq('user_id', userId).in('entity_id', postIds),
    supabase.from('saves').select('entity_id').eq('entity_type', 'post').eq('user_id', userId).in('entity_id', postIds),
  ]);

  const likeCounts = new Map<string, number>();
  const saveCounts = new Map<string, number>();
  const commentCounts = new Map<string, number>();
  const userLikedSet = new Set(userLikes?.map(l => l.entity_id) || []);
  const userSavedSet = new Set(userSaves?.map(s => s.entity_id) || []);

  (likesData || []).forEach(({ entity_id }) => likeCounts.set(entity_id, (likeCounts.get(entity_id) || 0) + 1));
  (savesData || []).forEach(({ entity_id }) => saveCounts.set(entity_id, (saveCounts.get(entity_id) || 0) + 1));
  (commentsData || []).forEach(({ entity_id }) => commentCounts.set(entity_id, (commentCounts.get(entity_id) || 0) + 1));

  const result: Record<string, EngagementCounts> = {};
  postIds.forEach(postId => {
    result[postId] = {
      likes: likeCounts.get(postId) || 0,
      saves: saveCounts.get(postId) || 0,
      comments: commentCounts.get(postId) || 0,
      reposts: 0,
      hasLiked: userLikedSet.has(postId),
      hasSaved: userSavedSet.has(postId),
      hasReposted: false,
    };
  });
  return result;
}

export function useHeadshotFollowingFeed({
  userId,
  limit = 50,
}: UseHeadshotFollowingFeedProps): UseHeadshotFollowingFeedReturn {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [headshotImages, setHeadshotImages] = useState<Map<string, string | null>>(new Map());
  const [engagementCounts, setEngagementCounts] = useState<Record<string, EngagementCounts>>({});
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('followed_user_id')
        .eq('follower_user_id', userId)
        .eq('status', 'accepted');

      if (followsError) throw followsError;

      const followedUserIds = new Set((follows || []).map((row) => row.followed_user_id));

      const { data: allItems } = await getFeed(userId, limit * 3, 0);
      const headshotItems = (allItems || []).filter(item => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        if (post?.entity_type !== 'headshot') return false;

        const actorUserId =
          item.type === 'post'
            ? item.post?.owner_user_id
            : item.repost?.user_id || item.owner?.id;

        if (!actorUserId) return false;
        return followedUserIds.has(actorUserId);
      }).slice(0, limit);

      setFeed(headshotItems);

      // Build image URL map
      const imageCache = new Map<string, string | null>();
      headshotItems.forEach(item => {
        const h = item.entity?.headshot;
        if (h?.storage_key) {
          const { data } = supabase.storage
            .from(h.storage_bucket || 'user-images')
            .getPublicUrl(h.storage_key);
          imageCache.set(h.id, data.publicUrl);
        } else if (h) {
          imageCache.set(h.id, null);
        }
      });
      setHeadshotImages(imageCache);

      // Engagement counts
      const postIds = headshotItems.map(item => {
        const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
        return post.id;
      });
      const counts = await batchGetEngagement(postIds, userId);

      // Add repost counts
      const repostCounts = await Promise.all(
        postIds.map(async id => ({ id, count: await getRepostCount(id) }))
      );
      const userRepostFlags = await Promise.all(
        postIds.map(async id => ({ id, hasReposted: await hasReposted(userId, id) }))
      );
      repostCounts.forEach(r => {
        if (counts[r.id]) counts[r.id].reposts = r.count;
      });
      userRepostFlags.forEach(r => {
        if (counts[r.id]) counts[r.id].hasReposted = r.hasReposted;
      });

      setEngagementCounts(counts);
    } catch (error) {
      console.error('Error loading headshot following feed:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return { feed, headshotImages, engagementCounts, setEngagementCounts, loading, refresh: loadFeed };
}

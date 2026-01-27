/**
 * useFeed Hook
 * Load and cache feed items with images and engagement counts
 */

import { useState, useEffect } from 'react';
import { getFeed, FeedItem } from '@/lib/posts';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { getLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import {
  getLikeCount,
  getSaveCount,
  getCommentCount,
  hasLiked,
  hasSaved,
} from '@/lib/engagement';
import { getRepostCount, hasReposted } from '@/lib/reposts';
import { isFollowing } from '@/lib/user';

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
  filterByUserId?: string; // Optional: only show posts from this user
  limit?: number;
}

interface UseFeedReturn {
  feed: FeedItem[];
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, any>;
  engagementCounts: Record<string, EngagementCounts>;
  followStatuses: Map<string, boolean>;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useFeed({
  userId,
  filterByUserId,
  limit = 50,
}: UseFeedProps): UseFeedReturn {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [outfitImages, setOutfitImages] = useState<Map<string, string | null>>(new Map());
  const [lookbookImages, setLookbookImages] = useState<Map<string, any>>(new Map());
  const [engagementCounts, setEngagementCounts] = useState<Record<string, EngagementCounts>>(
    {}
  );
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

      // Load engagement counts and images in parallel
      const counts: Record<string, EngagementCounts> = {};
      const outfitImageCache = new Map<string, string | null>();
      const lookbookImageCache = new Map<string, any>();
      const followStatusMap = new Map<string, boolean>();

      await Promise.all(
        filteredFeed.map(async (item) => {
          const post = item.type === 'post' ? item.post : item.repost?.original_post;
          if (!post) return;

          const postId = post.id;
          const ownerId = post.owner_user_id;

          // Check follow status for non-own posts
          if (ownerId !== userId && !followStatusMap.has(ownerId)) {
            const { isFollowing: following } = await isFollowing(userId, ownerId);
            followStatusMap.set(ownerId, following);
          }

          // Load engagement counts
          const [likes, saves, comments, reposts, liked, saved, reposted] =
            await Promise.all([
              getLikeCount('post', postId),
              getSaveCount('post', postId),
              getCommentCount('post', postId),
              getRepostCount(postId),
              hasLiked(userId, 'post', postId),
              hasSaved(userId, 'post', postId),
              hasReposted(userId, postId),
            ]);

          counts[postId] = {
            likes,
            saves,
            comments,
            reposts,
            hasLiked: liked,
            hasSaved: saved,
            hasReposted: reposted,
          };

          // Cache outfit images
          if (post.entity_type === 'outfit' && item.entity?.outfit) {
            const outfitId = item.entity.outfit.id;
            if (!outfitImageCache.has(outfitId)) {
              const url = await getOutfitCoverImageUrl(item.entity.outfit);
              outfitImageCache.set(outfitId, url);
            }
          }

          // Cache lookbook outfits and images
          if (post.entity_type === 'lookbook' && item.entity?.lookbook) {
            const lookbookId = item.entity.lookbook.id;
            if (!lookbookImageCache.has(lookbookId)) {
              const { data } = await getLookbook(lookbookId);
              if (data && data.outfits.length > 0) {
                const lookbookOwnerId = data.lookbook.owner_user_id;
                const { data: allOutfits } = await getUserOutfits(lookbookOwnerId);

                if (allOutfits) {
                  const lookbookOutfits = data.outfits
                    .map((lo: any) => allOutfits.find((o: any) => o.id === lo.outfit_id))
                    .filter(Boolean);

                  // Store outfits for carousel
                  lookbookImageCache.set(`${lookbookId}_outfits`, lookbookOutfits);

                  // Load all outfit images in parallel
                  const imageUrls = await Promise.all(
                    lookbookOutfits.map(async (outfit) => {
                      const url = await getOutfitCoverImageUrl(outfit);
                      return { outfitId: outfit.id, url };
                    })
                  );

                  // Set first image as thumbnail
                  if (imageUrls.length > 0) {
                    lookbookImageCache.set(lookbookId, imageUrls[0].url);
                  }

                  // Cache all outfit images
                  imageUrls.forEach(({ outfitId, url }) => {
                    lookbookImageCache.set(`${lookbookId}_outfit_${outfitId}`, url);
                  });
                } else {
                  lookbookImageCache.set(lookbookId, null);
                }
              } else {
                lookbookImageCache.set(lookbookId, null);
              }
            }
          }
        })
      );

      setEngagementCounts(counts);
      setFollowStatuses(followStatusMap);
      setOutfitImages(outfitImageCache);
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
    followStatuses,
    loading,
    refresh,
  };
}

export type { EngagementCounts };

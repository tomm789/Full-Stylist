/**
 * Hook for handling engagement actions (like, save, repost)
 */

import { useState } from 'react';
import {
  likeEntity,
  unlikeEntity,
  hasLiked,
  getLikeCount,
  saveEntity,
  unsaveEntity,
  hasSaved,
  getSaveCount,
} from '@/lib/engagement';
import { createRepost, removeRepost, hasReposted, getRepostCount } from '@/lib/reposts';

type EngagementCounts = Record<
  string,
  {
    likes: number;
    saves: number;
    comments: number;
    reposts: number;
    hasLiked: boolean;
    hasSaved: boolean;
    hasReposted: boolean;
  }
>;

export const useEngagementActions = (userId: string | undefined) => {
  const [engagementCounts, setEngagementCounts] = useState<EngagementCounts>({});

  const handleLike = async (postId: string) => {
    if (!userId) return;

    const currentlyLiked = engagementCounts[postId]?.hasLiked || false;

    if (currentlyLiked) {
      await unlikeEntity(userId, 'post', postId);
    } else {
      await likeEntity(userId, 'post', postId);
    }

    // Refresh counts
    const [likes, liked] = await Promise.all([
      getLikeCount('post', postId),
      hasLiked(userId, 'post', postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        likes,
        hasLiked: liked,
      },
    }));
  };

  const handleSave = async (postId: string) => {
    if (!userId) return;

    const currentlySaved = engagementCounts[postId]?.hasSaved || false;

    if (currentlySaved) {
      await unsaveEntity(userId, 'post', postId);
    } else {
      await saveEntity(userId, 'post', postId);
    }

    // Refresh counts
    const [saves, saved] = await Promise.all([
      getSaveCount('post', postId),
      hasSaved(userId, 'post', postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        saves,
        hasSaved: saved,
      },
    }));
  };

  const handleRepost = async (postId: string, onRefresh?: () => Promise<void>) => {
    if (!userId) return;

    const currentlyReposted = engagementCounts[postId]?.hasReposted || false;

    if (currentlyReposted) {
      await removeRepost(userId, postId);
    } else {
      await createRepost(userId, postId);
    }

    // Refresh counts
    const [reposts, reposted] = await Promise.all([
      getRepostCount(postId),
      hasReposted(userId, postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        reposts,
        hasReposted: reposted,
      },
    }));

    // Refresh feed to show new repost
    if (onRefresh) {
      await onRefresh();
    }
  };

  const updateCommentCount = (postId: string, count: number) => {
    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        comments: count,
      },
    }));
  };

  return {
    engagementCounts,
    setEngagementCounts,
    handleLike,
    handleSave,
    handleRepost,
    updateCommentCount,
  };
};

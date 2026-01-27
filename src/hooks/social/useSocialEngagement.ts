/**
 * useSocialEngagement Hook
 * Handle like, save, comment, and repost actions
 */

import { useState } from 'react';
import {
  likeEntity,
  unlikeEntity,
  saveEntity,
  unsaveEntity,
  hasLiked,
  hasSaved,
  getLikeCount,
  getSaveCount,
} from '@/lib/engagement';
import { createRepost, removeRepost, hasReposted, getRepostCount } from '@/lib/reposts';
import { EngagementCounts } from './useFeed';

interface UseSocialEngagementProps {
  userId: string | undefined;
  engagementCounts: Record<string, EngagementCounts>;
  setEngagementCounts: React.Dispatch<
    React.SetStateAction<Record<string, EngagementCounts>>
  >;
  onRepost?: () => Promise<void>; // Callback to refresh feed after repost
}

interface UseSocialEngagementReturn {
  handleLike: (postId: string) => Promise<void>;
  handleSave: (postId: string) => Promise<void>;
  handleRepost: (postId: string) => Promise<void>;
  liking: Set<string>;
  saving: Set<string>;
  reposting: Set<string>;
}

export function useSocialEngagement({
  userId,
  engagementCounts,
  setEngagementCounts,
  onRepost,
}: UseSocialEngagementProps): UseSocialEngagementReturn {
  const [liking, setLiking] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [reposting, setReposting] = useState<Set<string>>(new Set());

  const handleLike = async (postId: string) => {
    if (!userId) return;

    setLiking((prev) => new Set(prev).add(postId));

    try {
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
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setLiking((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleSave = async (postId: string) => {
    if (!userId) return;

    setSaving((prev) => new Set(prev).add(postId));

    try {
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
    } catch (error) {
      console.error('Error saving post:', error);
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleRepost = async (postId: string) => {
    if (!userId) return;

    setReposting((prev) => new Set(prev).add(postId));

    try {
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

      // Callback to refresh feed if provided
      if (onRepost) {
        await onRepost();
      }
    } catch (error) {
      console.error('Error reposting:', error);
    } finally {
      setReposting((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  return {
    handleLike,
    handleSave,
    handleRepost,
    liking,
    saving,
    reposting,
  };
}

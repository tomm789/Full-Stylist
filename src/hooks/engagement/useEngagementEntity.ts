/**
 * useEngagementEntity Hook
 * Entity-scoped engagement for single-item detail views.
 * Owns all scalar state with optimistic updates and rollback on error.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  likeEntity,
  unlikeEntity,
  hasLiked,
  getLikeCount,
  saveEntity,
  unsaveEntity,
  hasSaved,
  getSaveCount,
  createComment,
  getComments,
  getCommentCount,
} from '@/lib/engagement';
import type { Comment } from '@/lib/engagement';
import {
  createRepost,
  removeRepost,
  hasReposted,
  getRepostCount,
} from '@/lib/engagement/reposts';
import type {
  EngagementEntityType,
  DBEngagementEntityType,
  UseEngagementEntityOptions,
  UseEngagementEntityReturn,
} from './types';

export function useEngagementEntity(
  entityType: EngagementEntityType,
  entityId: string | null,
  userId: string | null | undefined,
  options?: UseEngagementEntityOptions,
): UseEngagementEntityReturn {
  const { deferInitialFetch = false } = options ?? {};
  const loadStartedRef = useRef(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // wardrobe_item has no engagement rows — skip all API calls
  const dbType: DBEngagementEntityType | null =
    entityType === 'wardrobe_item' ? null : entityType;

  const supportsReposts = entityType === 'post';

  const loadEngagement = useCallback(async () => {
    if (!entityId || !userId || !dbType) return;
    try {
      const promises: Promise<any>[] = [
        hasLiked(userId, dbType, entityId),
        getLikeCount(dbType, entityId),
        hasSaved(userId, dbType, entityId),
        getSaveCount(dbType, entityId),
        getCommentCount(dbType, entityId),
      ];
      if (supportsReposts) {
        promises.push(hasReposted(userId, entityId));
        promises.push(getRepostCount(entityId));
      }

      const results = await Promise.all(promises);
      setLiked(results[0]);
      setLikeCount(results[1]);
      setSaved(results[2]);
      setSaveCount(results[3]);
      setCommentCount(results[4]);
      if (supportsReposts) {
        setReposted(results[5]);
        setRepostCount(results[6]);
      }
    } catch (error) {
      console.error('Failed to load engagement:', error);
    }
  }, [entityId, userId, dbType, supportsReposts]);

  const loadComments = useCallback(async () => {
    if (!entityId || !dbType) return;
    setLoadingComments(true);
    try {
      const { data } = await getComments(dbType, entityId);
      if (data) setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [entityId, dbType]);

  const toggleLike = useCallback(async () => {
    if (!userId || !entityId || !dbType) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      if (prevLiked) {
        await unlikeEntity(userId, dbType, entityId);
      } else {
        await likeEntity(userId, dbType, entityId);
      }
    } catch (error) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      console.error('Failed to toggle like:', error);
    }
  }, [userId, entityId, dbType, liked, likeCount]);

  const toggleSave = useCallback(async () => {
    if (!userId || !entityId || !dbType) return;
    const prevSaved = saved;
    const prevCount = saveCount;
    setSaved(!prevSaved);
    setSaveCount(prevSaved ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      if (prevSaved) {
        await unsaveEntity(userId, dbType, entityId);
      } else {
        await saveEntity(userId, dbType, entityId);
      }
    } catch (error) {
      setSaved(prevSaved);
      setSaveCount(prevCount);
      console.error('Failed to toggle save:', error);
    }
  }, [userId, entityId, dbType, saved, saveCount]);

  const toggleRepost = useCallback(async () => {
    if (!userId || !entityId || !supportsReposts) return;
    const prevReposted = reposted;
    const prevCount = repostCount;
    setReposted(!prevReposted);
    setRepostCount(prevReposted ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      if (prevReposted) {
        await removeRepost(userId, entityId);
      } else {
        await createRepost(userId, entityId);
      }
    } catch (error) {
      setReposted(prevReposted);
      setRepostCount(prevCount);
      console.error('Failed to toggle repost:', error);
    }
  }, [userId, entityId, supportsReposts, reposted, repostCount]);

  const submitComment = useCallback(
    async (text: string) => {
      if (!userId || !entityId || !text.trim() || !dbType) return false;
      try {
        const { data, error } = await createComment(
          userId, dbType, entityId, text.trim(),
        );
        if (!error && data) {
          setComments((prev) => [data, ...prev]);
          setCommentCount((prev) => prev + 1);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to submit comment:', error);
        return false;
      }
    },
    [userId, entityId, dbType],
  );

  useEffect(() => {
    if (!deferInitialFetch) loadEngagement();
  }, [loadEngagement, deferInitialFetch]);

  const triggerLoadEngagement = useCallback(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;
    loadEngagement();
  }, [loadEngagement]);

  return {
    liked,
    likeCount,
    saved,
    saveCount,
    commentCount,
    reposted,
    repostCount,
    comments,
    loadingComments,
    toggleLike,
    toggleSave,
    toggleRepost,
    loadComments,
    submitComment,
    triggerLoadEngagement: deferInitialFetch ? triggerLoadEngagement : undefined,
  };
}

/**
 * useSocialEngagement Hook
 * Manages social engagement (likes, saves, comments) for entities
 */

import { useState, useEffect, useCallback } from 'react';
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
  Comment,
} from '@/lib/engagement';

type EntityType = 'outfit' | 'wardrobe_item' | 'post';

export function useSocialEngagement(
  entityType: EntityType,
  entityId: string | null,
  userId: string | null | undefined
) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saveCount, setSaveCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Load engagement data
  const loadEngagement = useCallback(async () => {
    if (!entityId || !userId) return;

    try {
      const [likedRes, likeCountRes, savedRes, saveCountRes, commentCountRes] =
        await Promise.all([
          hasLiked(userId, entityType, entityId),
          getLikeCount(entityType, entityId),
          hasSaved(userId, entityType, entityId),
          getSaveCount(entityType, entityId),
          getCommentCount(entityType, entityId),
        ]);

      setLiked(likedRes);
      setLikeCount(likeCountRes);
      setSaved(savedRes);
      setSaveCount(saveCountRes);
      setCommentCount(commentCountRes);
    } catch (error) {
      console.error('Failed to load social engagement:', error);
    }
  }, [entityId, userId, entityType]);

  // Load comments
  const loadComments = useCallback(async () => {
    if (!entityId) return;

    setLoadingComments(true);
    try {
      const { data } = await getComments(entityType, entityId);
      if (data) {
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [entityId, entityType]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!userId || !entityId) return;

    try {
      if (liked) {
        await unlikeEntity(userId, entityType, entityId);
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await likeEntity(userId, entityType, entityId);
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [userId, entityId, entityType, liked]);

  // Toggle save
  const toggleSave = useCallback(async () => {
    if (!userId || !entityId) return;

    try {
      if (saved) {
        await unsaveEntity(userId, entityType, entityId);
        setSaved(false);
        setSaveCount((prev) => Math.max(0, prev - 1));
      } else {
        await saveEntity(userId, entityType, entityId);
        setSaved(true);
        setSaveCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
    }
  }, [userId, entityId, entityType, saved]);

  // Submit comment
  const submitComment = useCallback(
    async (text: string) => {
      if (!userId || !entityId || !text.trim()) return;

      try {
        const { data, error } = await createComment(
          userId,
          entityType,
          entityId,
          text.trim()
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
    [userId, entityId, entityType]
  );

  useEffect(() => {
    loadEngagement();
  }, [loadEngagement]);

  return {
    liked,
    likeCount,
    saved,
    saveCount,
    commentCount,
    comments,
    loadingComments,
    toggleLike,
    toggleSave,
    loadComments,
    submitComment,
  };
}

export default useSocialEngagement;

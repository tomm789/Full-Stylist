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

  // Engagement lib supports 'outfit' | 'post' | 'lookbook' (and comments: 'feedback_thread'); skip API for wardrobe_item
  const engagementEntityType = entityType === 'wardrobe_item' ? null : (entityType as 'outfit' | 'post' | 'lookbook');

  // Load engagement data
  const loadEngagement = useCallback(async () => {
    if (!entityId || !userId || !engagementEntityType) return;

    try {
      const [likedRes, likeCountRes, savedRes, saveCountRes, commentCountRes] =
        await Promise.all([
          hasLiked(userId, engagementEntityType, entityId),
          getLikeCount(engagementEntityType, entityId),
          hasSaved(userId, engagementEntityType, entityId),
          getSaveCount(engagementEntityType, entityId),
          getCommentCount(engagementEntityType, entityId),
        ]);

      setLiked(likedRes);
      setLikeCount(likeCountRes);
      setSaved(savedRes);
      setSaveCount(saveCountRes);
      setCommentCount(commentCountRes);
    } catch (error) {
      console.error('Failed to load social engagement:', error);
    }
  }, [entityId, userId, engagementEntityType]);

  // Load comments
  const loadComments = useCallback(async () => {
    if (!entityId || !engagementEntityType) return;

    setLoadingComments(true);
    try {
      const { data } = await getComments(engagementEntityType, entityId);
      if (data) {
        setComments(data);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  }, [entityId, engagementEntityType]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!userId || !entityId) return;

    try {
      if (liked) {
        await unlikeEntity(userId, engagementEntityType!, entityId);
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await likeEntity(userId, engagementEntityType!, entityId);
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [userId, entityId, engagementEntityType, liked]);

  // Toggle save
  const toggleSave = useCallback(async () => {
    if (!userId || !entityId) return;

    try {
      if (saved) {
        await unsaveEntity(userId, engagementEntityType!, entityId);
        setSaved(false);
        setSaveCount((prev) => Math.max(0, prev - 1));
      } else {
        await saveEntity(userId, engagementEntityType!, entityId);
        setSaved(true);
        setSaveCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle save:', error);
    }
  }, [userId, entityId, engagementEntityType, saved]);

  // Submit comment
  const submitComment = useCallback(
    async (text: string) => {
      if (!userId || !entityId || !text.trim() || !engagementEntityType) return false;

      try {
        const { data, error } = await createComment(
          userId,
          engagementEntityType,
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
    [userId, entityId, engagementEntityType]
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

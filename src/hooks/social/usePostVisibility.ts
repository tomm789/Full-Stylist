/**
 * usePostVisibility Hook
 * Manages visibility state for a post's VisibilityToggle.
 * Fetches the post for an entity and provides a change handler.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPostForEntity,
  updatePostVisibility,
  type EntityType,
  type Visibility,
} from '@/lib/posts';
import { useAuth } from '@/contexts/AuthContext';

interface UsePostVisibilityProps {
  entityType: EntityType;
  entityId: string | undefined;
}

interface UsePostVisibilityReturn {
  visibility: Visibility;
  postId: string | null;
  loading: boolean;
  handleVisibilityChange: (visibility: Visibility) => void;
}

export function usePostVisibility({
  entityType,
  entityId,
}: UsePostVisibilityProps): UsePostVisibilityReturn {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<Visibility>('followers');
  const [postId, setPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !entityId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: post } = await getPostForEntity(user.id, entityType, entityId);
      if (cancelled) return;
      if (post) {
        setPostId(post.id);
        setVisibility(post.visibility);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id, entityType, entityId]);

  const handleVisibilityChange = useCallback(
    async (newVisibility: Visibility) => {
      if (!user?.id || !postId) return;

      // Optimistic update
      const prevVisibility = visibility;
      setVisibility(newVisibility);

      const { error } = await updatePostVisibility(postId, user.id, newVisibility);
      if (error) {
        // Rollback on error
        setVisibility(prevVisibility);
        if (__DEV__) console.warn('Failed to update visibility:', error);
      }
    },
    [user?.id, postId, visibility]
  );

  return {
    visibility,
    postId,
    loading,
    handleVisibilityChange,
  };
}

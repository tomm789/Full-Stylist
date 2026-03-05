/**
 * useEngagementFeed Hook
 * Feed-scoped engagement for list/grid views.
 * Owns Record<string, EngagementCounts> state with optimistic updates,
 * rollback on error, and in-flight tracking to debounce rapid taps.
 */

import { useState, useCallback, useRef } from 'react';
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
import {
  createRepost,
  removeRepost,
  hasReposted,
  getRepostCount,
} from '@/lib/reposts';
import type {
  EngagementCounts,
  UseEngagementFeedOptions,
  UseEngagementFeedReturn,
} from './types';
import { DEFAULT_ENGAGEMENT_COUNTS } from './types';

export function useEngagementFeed(
  userId: string | null | undefined,
  options?: UseEngagementFeedOptions,
): UseEngagementFeedReturn {
  const { initialCounts, onRepost } = options ?? {};

  const [counts, setCounts] = useState<Record<string, EngagementCounts>>(
    initialCounts ?? {},
  );

  // In-flight refs prevent duplicate taps while an action is pending
  const likingRef = useRef<Set<string>>(new Set());
  const savingRef = useRef<Set<string>>(new Set());
  const repostingRef = useRef<Set<string>>(new Set());

  // Ref to always read latest onRepost without re-creating callbacks
  const onRepostRef = useRef(onRepost);
  onRepostRef.current = onRepost;

  const seedCounts = useCallback(
    (next: Record<string, EngagementCounts>) => {
      setCounts(next);
    },
    [],
  );

  const getCountsFor = useCallback(
    (entityId: string): EngagementCounts =>
      counts[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS,
    [counts],
  );

  // ─── Like ───────────────────────────────────────────────────────────────────

  const handleLike = useCallback(
    async (entityId: string) => {
      if (!userId || likingRef.current.has(entityId)) return;

      let prev: EngagementCounts;
      setCounts((c) => {
        prev = c[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS;
        const wasLiked = prev.hasLiked;
        return {
          ...c,
          [entityId]: {
            ...prev,
            hasLiked: !wasLiked,
            likes: wasLiked ? Math.max(0, prev.likes - 1) : prev.likes + 1,
          },
        };
      });

      likingRef.current.add(entityId);
      try {
        if (prev!.hasLiked) {
          await unlikeEntity(userId, 'post', entityId);
        } else {
          await likeEntity(userId, 'post', entityId);
        }
        // Confirm with server values
        const [likes, liked] = await Promise.all([
          getLikeCount('post', entityId),
          hasLiked(userId, 'post', entityId),
        ]);
        setCounts((c) => ({
          ...c,
          [entityId]: {
            ...(c[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS),
            likes,
            hasLiked: liked,
          },
        }));
      } catch (error) {
        // Rollback
        setCounts((c) => ({
          ...c,
          [entityId]: prev!,
        }));
        console.error('Failed to toggle like:', error);
      } finally {
        likingRef.current.delete(entityId);
      }
    },
    [userId],
  );

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (entityId: string) => {
      if (!userId || savingRef.current.has(entityId)) return;

      let prev: EngagementCounts;
      setCounts((c) => {
        prev = c[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS;
        const wasSaved = prev.hasSaved;
        return {
          ...c,
          [entityId]: {
            ...prev,
            hasSaved: !wasSaved,
            saves: wasSaved ? Math.max(0, prev.saves - 1) : prev.saves + 1,
          },
        };
      });

      savingRef.current.add(entityId);
      try {
        if (prev!.hasSaved) {
          await unsaveEntity(userId, 'post', entityId);
        } else {
          await saveEntity(userId, 'post', entityId);
        }
        // Confirm with server values
        const [saves, saved] = await Promise.all([
          getSaveCount('post', entityId),
          hasSaved(userId, 'post', entityId),
        ]);
        setCounts((c) => ({
          ...c,
          [entityId]: {
            ...(c[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS),
            saves,
            hasSaved: saved,
          },
        }));
      } catch (error) {
        // Rollback
        setCounts((c) => ({
          ...c,
          [entityId]: prev!,
        }));
        console.error('Failed to toggle save:', error);
      } finally {
        savingRef.current.delete(entityId);
      }
    },
    [userId],
  );

  // ─── Repost ─────────────────────────────────────────────────────────────────

  const handleRepost = useCallback(
    async (entityId: string) => {
      if (!userId || repostingRef.current.has(entityId)) return;

      let prev: EngagementCounts;
      setCounts((c) => {
        prev = c[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS;
        const wasReposted = prev.hasReposted;
        return {
          ...c,
          [entityId]: {
            ...prev,
            hasReposted: !wasReposted,
            reposts: wasReposted
              ? Math.max(0, prev.reposts - 1)
              : prev.reposts + 1,
          },
        };
      });

      repostingRef.current.add(entityId);
      try {
        if (prev!.hasReposted) {
          await removeRepost(userId, entityId);
        } else {
          await createRepost(userId, entityId);
        }
        // Confirm with server values
        const [reposts, reposted] = await Promise.all([
          getRepostCount(entityId),
          hasReposted(userId, entityId),
        ]);
        setCounts((c) => ({
          ...c,
          [entityId]: {
            ...(c[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS),
            reposts,
            hasReposted: reposted,
          },
        }));

        // Fire onRepost callback (e.g. refresh feed)
        if (onRepostRef.current) {
          await onRepostRef.current(entityId);
        }
      } catch (error) {
        // Rollback
        setCounts((c) => ({
          ...c,
          [entityId]: prev!,
        }));
        console.error('Failed to toggle repost:', error);
      } finally {
        repostingRef.current.delete(entityId);
      }
    },
    [userId],
  );

  // ─── Comment count update ───────────────────────────────────────────────────

  const updateCommentCount = useCallback(
    (entityId: string, count: number) => {
      setCounts((c) => ({
        ...c,
        [entityId]: {
          ...(c[entityId] ?? DEFAULT_ENGAGEMENT_COUNTS),
          comments: count,
        },
      }));
    },
    [],
  );

  return {
    counts,
    seedCounts,
    getCountsFor,
    handleLike,
    handleSave,
    handleRepost,
    updateCommentCount,
    liking: likingRef.current,
    saving: savingRef.current,
    reposting: repostingRef.current,
  };
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedItem } from '@/lib/posts';
import { getUserSaves } from '@/lib/engagement/saves';

type UseOutfitsSocialFeedParams = {
  userId?: string;
  exploreFeed: FeedItem[];
  showGridOutfits: boolean;
  showGridLookbooks: boolean;
  selectedOccasions: string[];
  showFavoritesOnly: boolean;
};

export function useOutfitsSocialFeed({
  userId,
  exploreFeed,
  showGridOutfits,
  showGridLookbooks,
  selectedOccasions,
  showFavoritesOnly,
}: UseOutfitsSocialFeedParams) {
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());
  const [savedOutfitIds, setSavedOutfitIds] = useState<Set<string>>(new Set());
  const [savedLookbookIds, setSavedLookbookIds] = useState<Set<string>>(new Set());
  const [followingRefreshing, setFollowingRefreshing] = useState(false);
  const [exploreRefreshing, setExploreRefreshing] = useState(false);

  const loadSavedEntities = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await getUserSaves(userId);
    if (error) {
      console.error('Failed to load saved entities:', error);
      return;
    }

    const postIds = new Set<string>();
    const outfitIds = new Set<string>();
    const lookbookIds = new Set<string>();

    (data || []).forEach((save) => {
      if (save.entity_type === 'post') postIds.add(save.entity_id);
      if (save.entity_type === 'outfit') outfitIds.add(save.entity_id);
      if (save.entity_type === 'lookbook') lookbookIds.add(save.entity_id);
    });

    setSavedPostIds(postIds);
    setSavedOutfitIds(outfitIds);
    setSavedLookbookIds(lookbookIds);
  }, [userId]);

  useEffect(() => {
    loadSavedEntities();
  }, [loadSavedEntities]);

  useEffect(() => {
    if (showFavoritesOnly) {
      loadSavedEntities();
    }
  }, [showFavoritesOnly, loadSavedEntities]);

  const applySavedFilter = useCallback(
    (items: FeedItem[]) => {
      if (!showFavoritesOnly) return items;
      return items.filter((item) => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        if (!post) return false;
        const savedPost = savedPostIds.has(post.id);
        if (post.entity_type === 'outfit') {
          return savedPost || savedOutfitIds.has(post.entity_id);
        }
        if (post.entity_type === 'lookbook') {
          return savedPost || savedLookbookIds.has(post.entity_id);
        }
        return false;
      });
    },
    [showFavoritesOnly, savedPostIds, savedOutfitIds, savedLookbookIds]
  );

  const applyGridFilters = useCallback(
    (items: FeedItem[]) =>
      applySavedFilter(items).filter((item) => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        if (!post) return false;
        if (post.entity_type === 'outfit') {
          if (!showGridOutfits) return false;
          if (selectedOccasions.length === 0) return true;
          const outfit = item.entity?.outfit as { occasions?: string[] } | undefined;
          return Boolean(
            outfit?.occasions?.some((occasion) => selectedOccasions.includes(occasion))
          );
        }
        if (post.entity_type === 'lookbook') {
          if (!showGridLookbooks) return false;
          return selectedOccasions.length === 0;
        }
        return false;
      }),
    [applySavedFilter, showGridOutfits, showGridLookbooks, selectedOccasions]
  );

  const discoverLookbookImages = useMemo(() => {
    const map = new Map<string, any>();
    exploreFeed.forEach((item) => {
      const lookbook = item.entity?.lookbook;
      if (item.post?.entity_type === 'lookbook' && lookbook) {
        map.set(lookbook.id, null);
        map.set(`${lookbook.id}_outfits`, []);
      }
    });
    return map;
  }, [exploreFeed]);

  const setSavedPostId = useCallback((postId: string) => {
    setSavedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  return {
    savedPostIds,
    savedOutfitIds,
    savedLookbookIds,
    applySavedFilter,
    applyGridFilters,
    discoverLookbookImages,
    setSavedPostId,
    followingRefreshing,
    setFollowingRefreshing,
    exploreRefreshing,
    setExploreRefreshing,
    loadSavedEntities,
  };
}

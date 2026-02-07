import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList } from 'react-native';
import { FeedItem } from '@/lib/posts';
import { OutfitsFeedItemRenderer } from '@/components/outfits';
import { useOutfitsSocialFeed } from './useOutfitsSocialFeed';

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

type MenuButtonPosition = { x: number; y: number; width: number; height: number };

type UseOutfitsFeedOrchestrationParams = {
  userId?: string;
  activeTab: 'my_outfits' | 'explore' | 'following';
  activeView: 'grid' | 'feed';
  exploreFeed: FeedItem[];
  followingFeed: FeedItem[];
  showGridOutfits: boolean;
  showGridLookbooks: boolean;
  selectedOccasions: string[];
  showFavoritesOnly: boolean;
  onSwitchToFeed: () => void;
  onOpenLookbook: (lookbookId: string) => void;
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, any>;
  currentUserId?: string;
  engagementCounts: EngagementCounts;
  onLike: (postId: string) => void;
  onComment: (item: FeedItem) => void;
  onRepost: (postId: string) => Promise<void> | void;
  onSave: (postId: string) => Promise<void> | void;
  onFindSimilar: (
    entityType: 'wardrobe_item' | 'outfit',
    entityId: string,
    categoryId?: string
  ) => void;
  openSlideshow: (lookbookId: string) => void;
  menuButtonRefs: React.MutableRefObject<Map<string, any>>;
  menuButtonPositions: React.MutableRefObject<Map<string, MenuButtonPosition>>;
  openMenuPostId: string | null;
  setMenuButtonPosition: (position: MenuButtonPosition | null) => void;
  setOpenMenuPostId: (postId: string | null) => void;
};

export function useOutfitsFeedOrchestration({
  userId,
  activeTab,
  activeView,
  exploreFeed,
  followingFeed,
  showGridOutfits,
  showGridLookbooks,
  selectedOccasions,
  showFavoritesOnly,
  onSwitchToFeed,
  onOpenLookbook,
  outfitImages,
  lookbookImages,
  currentUserId,
  engagementCounts,
  onLike,
  onComment,
  onRepost,
  onSave,
  onFindSimilar,
  openSlideshow,
  menuButtonRefs,
  menuButtonPositions,
  openMenuPostId,
  setMenuButtonPosition,
  setOpenMenuPostId,
}: UseOutfitsFeedOrchestrationParams) {
  const {
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
  } = useOutfitsSocialFeed({
    userId,
    exploreFeed,
    showGridOutfits,
    showGridLookbooks,
    selectedOccasions,
    showFavoritesOnly,
  });

  const followingFeedRef = useRef<FlatList<FeedItem>>(null);
  const discoverFeedRef = useRef<FlatList<FeedItem>>(null);
  const pendingScrollRef = useRef<{ itemId: string; tab: 'explore' | 'following' } | null>(
    null
  );
  const scrollAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_SCROLL_ATTEMPTS = 8;

  const activeFeedItems = useMemo(
    () => (activeTab === 'explore' ? exploreFeed : followingFeed),
    [activeTab, exploreFeed, followingFeed]
  );

  const followingGridImages = useMemo(() => {
    const map = new Map<string, string | null>();
    outfitImages.forEach((value, key) => map.set(key, value));
    lookbookImages.forEach((value, key) => {
      if (typeof value === 'string' || value === null) {
        map.set(key, value);
      }
    });
    return map;
  }, [outfitImages, lookbookImages]);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  const scheduleRetry = useCallback(() => {
    if (scrollAttemptRef.current >= MAX_SCROLL_ATTEMPTS) return;
    if (retryTimerRef.current) return;
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      scrollAttemptRef.current += 1;
      tryScrollToPending();
    }, 80);
  }, []);

  const tryScrollToPending = useCallback(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    if (activeView !== 'feed') return;

    const list = pending.tab === 'explore' ? exploreFeed : followingFeed;
    if (list.length === 0) {
      scheduleRetry();
      return;
    }

    const index = list.findIndex((item) => item.id === pending.itemId);
    if (index < 0) {
      scheduleRetry();
      return;
    }

    const listRef = pending.tab === 'explore' ? discoverFeedRef : followingFeedRef;
    if (!listRef.current) {
      scheduleRetry();
      return;
    }

    listRef.current.scrollToIndex({
      index,
      viewPosition: 0,
      animated: false,
    });

    pendingScrollRef.current = null;
    scrollAttemptRef.current = 0;
  }, [activeView, exploreFeed, followingFeed, scheduleRetry]);

  const handleGridFeedOpen = useCallback(
    (item: FeedItem) => {
      const post = item.type === 'post' ? item.post : item.repost?.original_post;
      if (!post) return;

      if (post.entity_type === 'outfit') {
        pendingScrollRef.current = {
          itemId: item.id,
          tab: activeTab === 'explore' ? 'explore' : 'following',
        };
        scrollAttemptRef.current = 0;
        onSwitchToFeed();
        tryScrollToPending();
        return;
      }
      if (post.entity_type === 'lookbook') {
        onOpenLookbook(post.entity_id);
      }
    },
    [activeTab, onOpenLookbook, onSwitchToFeed, tryScrollToPending]
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      const offset = Math.max(0, info.averageItemLength * info.index);
      if (activeTab === 'explore') {
        discoverFeedRef.current?.scrollToOffset({ offset, animated: false });
      }
      followingFeedRef.current?.scrollToOffset({ offset, animated: false });
      scheduleRetry();
    },
    [activeTab, scheduleRetry]
  );

  const handleFeedLayout = useCallback(
    (tab: 'explore' | 'following') => {
      if (!pendingScrollRef.current) return;
      if (pendingScrollRef.current.tab !== tab) return;
      tryScrollToPending();
    },
    [tryScrollToPending]
  );

  const renderFeedItem = useCallback(
    (
      outfitImageMap: Map<string, string | null>,
      lookbookImageMap: Map<string, any>
    ) =>
    ({ item }: { item: FeedItem }) => (
      <OutfitsFeedItemRenderer
        item={item}
        engagementCounts={engagementCounts}
        outfitImages={outfitImageMap}
        lookbookImages={lookbookImageMap}
        currentUserId={currentUserId}
        onLike={onLike}
        onComment={onComment}
        onRepost={onRepost}
        onSave={async (postId) => {
          await onSave(postId);
          setSavedPostId(postId);
        }}
        onFindSimilar={onFindSimilar}
        onMenuPress={(postId, position) => {
          setMenuButtonPosition(position);
          setOpenMenuPostId(openMenuPostId === postId ? null : postId);
        }}
        onOpenSlideshow={openSlideshow}
        menuButtonRefs={menuButtonRefs}
        menuButtonPositions={menuButtonPositions}
        openMenuPostId={openMenuPostId}
        setMenuButtonPosition={setMenuButtonPosition}
        setOpenMenuPostId={setOpenMenuPostId}
      />
    ),
    [
      currentUserId,
      engagementCounts,
      menuButtonPositions,
      menuButtonRefs,
      onComment,
      onFindSimilar,
      onLike,
      onRepost,
      onSave,
      openMenuPostId,
      openSlideshow,
      setMenuButtonPosition,
      setOpenMenuPostId,
      setSavedPostId,
    ]
  );

  return {
    activeFeedItems,
    applyGridFilters,
    applySavedFilter,
    discoverLookbookImages,
    exploreRefreshing,
    followingRefreshing,
    followingFeedRef,
    discoverFeedRef,
    handleFeedLayout,
    handleGridFeedOpen,
    handleScrollToIndexFailed,
    loadSavedEntities,
    renderFeedItem,
    savedOutfitIds,
    savedLookbookIds,
    savedPostIds,
    setExploreRefreshing,
    setFollowingRefreshing,
    followingGridImages,
  };
}

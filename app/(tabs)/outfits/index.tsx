/**
 * Outfits Screen (Refactored)
 * Main outfits screen with grid, explore, and scheduling flows.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import type { FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  useOutfits,
  useOutfitFilters,
  useOutfitSchedule,
  useOutfitFeedScroll,
  useMyOutfitsRenderers,
  useOutfitActions,
  useSelectedOutfitsBar,
  useOutfitsFeedOrchestration,
  useOutfitsModalsState,
  useOutfitsDerivedFilters,
} from '@/hooks/outfits';
import {
  OutfitsModalsContainer,
  OutfitsCalendarModals,
  OutfitsAuxModals,
  OutfitsSocialTab,
  OutfitsHeaderSection,
  OutfitsMyOutfitsTab,
} from '@/components/outfits';
import { OutfitScheduleStatus } from '@/types/outfits';
import {
  useFeed,
  useDiscoverFeed,
  useEngagementActions,
  useFeedSlideshow,
  useTryOnOutfit,
  useSocialModals,
} from '@/hooks/social';
import { useLookbookSelection } from '@/hooks/lookbooks';
import { LoadingSpinner } from '@/components/shared';
import { commonStyles, colors, layout } from '@/styles';
import { useSlotPresets } from '@/hooks/calendar';
import { useHideHeaderOnScroll } from '@/hooks/useHideHeaderOnScroll';
import styles from './styles';
type OutfitsTab = 'my_outfits' | 'explore' | 'following';
type ViewMode = 'grid' | 'feed';
const SHOW_VIEW_TOGGLE = false;
const STATUS_LABELS: Record<OutfitScheduleStatus, string> = {
  planned: 'Planned',
  worn: 'Worn',
  skipped: 'Skipped',
};

export default function OutfitsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const showTabLabels = windowWidth >= layout.containerMaxWidth;
  const [showSortModal, setShowSortModal] = useState(false);
  const [activeTab, setActiveTab] = useState<OutfitsTab>('my_outfits');
  const [tabViews, setTabViews] = useState<Record<OutfitsTab, ViewMode>>({
    my_outfits: 'grid',
    explore: 'grid',
    following: 'grid',
  });
  const [openOutfitMenuId, setOpenOutfitMenuId] = useState<string | null>(null);
  const {
    headerHeight,
    headerOpacity,
    headerTranslate,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll: handleGridScroll,
    setHeaderVisible,
    resetScroll,
  } = useHideHeaderOnScroll();
  const {
    selectionMode,
    setSelectionMode,
    selectedOutfitIds,
    selectedOutfitImages,
    toggleOutfitSelection,
    exitSelectionMode,
    lookbookTitle,
    setLookbookTitle,
    lookbookDescription,
    setLookbookDescription,
    lookbookVisibility,
    setLookbookVisibility,
    lookbookSaving,
    lookbookPickerVisible,
    setLookbookPickerVisible,
    selectedLookbookId,
    setSelectedLookbookId,
    userLookbooks,
    loadingLookbooks,
    handleCreateLookbook,
    handleAddToExistingLookbook,
  } = useLookbookSelection({
    userId: user?.id,
    onNavigateToLookbook: (lookbookId) => router.push(`/lookbooks/${lookbookId}`),
  });

  React.useEffect(() => {
    if (!tab) return;
    const nextTab = Array.isArray(tab) ? tab[0] : tab;
    if (nextTab === 'my_outfits' || nextTab === 'explore' || nextTab === 'following') {
      setActiveTab(nextTab);
    }
  }, [tab]);

  // Filters state
  const {
    filters,
    updateFilter,
    getSortLabel,
  } = useOutfitFilters([]);

  const { presets, createPreset } = useSlotPresets({ userId: user?.id });

  // Load outfits with filters
  const { outfits, imageCache, loading, refreshing, refresh } = useOutfits({
    userId: user?.id,
    searchQuery: filters.searchQuery,
    favoritesOnly: false,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // Use filtered outfits from the hook
  const { filteredOutfits } = useOutfitFilters(outfits);
  const outfitIds = React.useMemo(() => outfits.map((outfit) => outfit.id), [outfits]);

  const {
    showDatePickerModal,
    setShowDatePickerModal,
    selectedDateKey,
    entriesForDate,
    loadingEntriesForDate,
    scheduleOutfitId,
    form,
    handleDateSelect,
    openScheduleForOutfit,
    getScheduleInfo,
  } = useOutfitSchedule({
    userId: user?.id,
    outfitIds,
    statusLabels: STATUS_LABELS,
  });

  // Social feeds (Explore + Following)
  const {
    feed,
    outfitImages,
    lookbookImages,
    engagementCounts: feedEngagementCounts,
    followStatuses: feedFollowStatuses,
    loading: feedLoading,
    refresh: refreshFeed,
  } = useFeed({ userId: user?.id });

  const {
    discoverFeed,
    discoverImages,
    loading: discoverLoading,
    refresh: refreshDiscover,
    loadMore: loadMoreDiscover,
    hasMore: discoverHasMore,
  } = useDiscoverFeed({ userId: user?.id });

  const exploreOutfitFeed = React.useMemo(
    () =>
      discoverFeed.filter(
        (item) =>
          item.type === 'post' &&
          item.post?.entity_type === 'outfit' &&
          item.post?.visibility === 'public'
      ),
    [discoverFeed]
  );

  const followingOutfitFeed = React.useMemo(
    () =>
      feed.filter(
        (item) =>
          item.type === 'post' &&
          item.post?.entity_type === 'outfit' &&
          item.post?.visibility === 'followers' &&
          item.post?.owner_user_id !== user?.id
      ),
    [feed, user?.id]
  );

  const [showGridOutfits, setShowGridOutfits] = useState(true);
  const [showGridLookbooks, setShowGridLookbooks] = useState(true);
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const {
    engagementCounts,
    setEngagementCounts,
    handleLike,
    handleSave,
    handleRepost,
    updateCommentCount,
  } = useEngagementActions(user?.id);

  const {
    slideshowVisible,
    slideshowLoading,
    slideshowOutfits,
    slideshowImages,
    currentSlideIndex,
    isAutoPlaying,
    openSlideshow,
    closeSlideshow,
    handleManualNavigation,
    toggleAutoPlay,
  } = useFeedSlideshow(user?.id);
  const { tryingOnOutfit, generatingOutfitId, tryOnOutfit } = useTryOnOutfit({
    userId: user?.id,
  });
  const modals = useSocialModals({ refreshFeed });

  React.useEffect(() => {
    setEngagementCounts(feedEngagementCounts);
  }, [feedEngagementCounts, setEngagementCounts]);

  React.useEffect(() => {
    modals.setFollowStatuses(feedFollowStatuses);
  }, [feedFollowStatuses, modals]);

  const activeView = tabViews[activeTab];
  const setActiveView = (view: ViewMode) => {
    setTabViews((prev) => ({
      ...prev,
      [activeTab]: view,
    }));
  };
  const handleRepostWithRefresh = async (postId: string) => {
    await handleRepost(postId, refreshFeed);
  };
  const {
    activeFeedItems,
    applySavedFilter,
    applyGridFilters,
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
    setExploreRefreshing,
    setFollowingRefreshing,
    followingGridImages,
  } = useOutfitsFeedOrchestration({
    userId: user?.id,
    activeTab,
    activeView,
    exploreFeed: exploreOutfitFeed,
    followingFeed: followingOutfitFeed,
    showGridOutfits,
    showGridLookbooks,
    selectedOccasions,
    showFavoritesOnly: filters.showFavoritesOnly,
    onSwitchToFeed: () => {
      setHeaderVisible(true);
      resetScroll();
      setActiveView('feed');
    },
    onOpenLookbook: (lookbookId) => router.push(`/lookbooks/${lookbookId}`),
    outfitImages,
    lookbookImages,
    currentUserId: user?.id,
    engagementCounts,
    onLike: handleLike,
    onComment: modals.openComments,
    onRepost: handleRepostWithRefresh,
    onSave: handleSave,
    onFindSimilar: modals.handleFindSimilar,
    openSlideshow,
    menuButtonRefs: modals.menuButtonRefs,
    menuButtonPositions: modals.menuButtonPositions,
    openMenuPostId: modals.openMenuPostId,
    setMenuButtonPosition: modals.setMenuButtonPosition,
    setOpenMenuPostId: modals.setOpenMenuPostId,
  });
  const { availableOccasions, toggleOccasion, filteredOutfitsWithOccasions } =
    useOutfitsDerivedFilters({
      activeTab,
      filteredOutfits,
      exploreOutfitFeed,
      followingOutfitFeed,
      selectedOccasions,
      setSelectedOccasions,
      showFavoritesOnly: filters.showFavoritesOnly,
      savedOutfitIds,
      getOutfitId: (outfit) => outfit.id,
      getOutfitOccasions: (outfit) => outfit.occasions,
    });
  const myOutfitsFeedRef = useRef<FlatList<any>>(null);
  const [pendingMyOutfitId, setPendingMyOutfitId] = useState<string | null>(null);
  const {
    handleLayout: handleMyOutfitsLayout,
    handleScrollToIndexFailed: handleMyOutfitsScrollToIndexFailed,
    tryScrollToPending: tryScrollMyOutfits,
  } = useOutfitFeedScroll({
    activeView,
    data: filteredOutfitsWithOccasions,
    getId: (outfit) => outfit.id,
    listRef: myOutfitsFeedRef,
    pendingId: pendingMyOutfitId,
    setPendingId: setPendingMyOutfitId,
  });

  const handleTabChange = (tab: OutfitsTab) => {
    setActiveTab(tab);
    setTabViews((prev) => ({
      ...prev,
      [tab]: 'grid',
    }));
  };

  const onRefresh = async () => {
    setFollowingRefreshing(true);
    await Promise.all([refreshFeed(), loadSavedEntities()]);
    setFollowingRefreshing(false);
  };

  const onDiscoverRefresh = async () => {
    setExploreRefreshing(true);
    await Promise.all([refreshDiscover(), loadSavedEntities()]);
    setExploreRefreshing(false);
  };

  const handleOutfitPress = (outfitId: string) => {
    const outfitIds = filteredOutfitsWithOccasions.map((o) => o.id).join(',');
    const activeFilters: string[] = [];

    if (filters.searchQuery.trim()) {
      activeFilters.push(`Search: "${filters.searchQuery.trim()}"`);
    }
    if (filters.showFavoritesOnly) {
      activeFilters.push('Favorites');
    }
    if (filters.sortBy !== 'date' || filters.sortOrder !== 'desc') {
      activeFilters.push(`Sort: ${getSortLabel()}`);
    }

    const filterSummary = activeFilters.join(' • ');
    const queryParts = [`outfitIds=${encodeURIComponent(outfitIds)}`];
    if (filterSummary) {
      queryParts.push(`filters=${encodeURIComponent(filterSummary)}`);
    }

    router.push(`/outfits/${outfitId}/view?${queryParts.join('&')}`);
  };

  const closeOutfitMenu = useCallback(() => setOpenOutfitMenuId(null), []);
  const closePostMenu = useCallback(() => {
    modals.setOpenMenuPostId(null);
    modals.setMenuButtonPosition(null);
  }, [modals]);

  const {
    handleEditOutfit,
    handleDuplicateOutfit,
    handleDeleteOutfit,
    handleArchiveOutfitFromPostMenu,
  } = useOutfitActions({
    userId: user?.id,
    router,
    refresh,
    refreshDiscover,
    onCloseOutfitMenu: closeOutfitMenu,
    onClosePostMenu: closePostMenu,
  });

  const handleOpenMyOutfitFeed = useCallback(
    (outfitId: string) => {
      setPendingMyOutfitId(outfitId);
      setActiveView('feed');
      tryScrollMyOutfits();
    },
    [tryScrollMyOutfits]
  );

  const { renderGridItem: renderMyOutfitGridItem, renderFeedItem: renderMyOutfitFeedItem } =
    useMyOutfitsRenderers({
      imageCache,
      getScheduleInfo,
      selectionMode,
      selectedOutfitIds,
      toggleOutfitSelection,
      onOpenFeed: handleOpenMyOutfitFeed,
      onActivateSelection: () => setSelectionMode(true),
      onOpenMenu: setOpenOutfitMenuId,
      onPressOutfit: handleOutfitPress,
      onSchedulePress: openScheduleForOutfit,
      userId: user?.id,
    });

  React.useEffect(() => {
    setHeaderVisible(true);
    resetScroll();
  }, [activeTab, resetScroll, setHeaderVisible]);

  const selectedOutfitsForBar = useSelectedOutfitsBar(
    selectedOutfitIds,
    selectedOutfitImages
  );
  const {
    sortState,
    postMenuState,
    commentsState,
    slideshowState,
    generationState,
    lookbookState,
  } = useOutfitsModalsState({
    userId: user?.id,
    activeFeedItems,
    outfitImages,
    sort: {
      showSortModal,
      setShowSortModal,
      filters,
      updateFilter,
      showGridOutfits,
      setShowGridOutfits,
      showGridLookbooks,
      setShowGridLookbooks,
      availableOccasions,
      selectedOccasions,
      toggleOccasion,
      setSelectedOccasions,
    },
    modals,
    updateCommentCount,
    tryOnOutfit,
    tryingOnOutfit,
    onArchiveOutfit: handleArchiveOutfitFromPostMenu,
    onViewOutfit: (outfitId: string) => {
      router.push(`/outfits/${outfitId}/view`);
    },
    generationOutfitId: generatingOutfitId,
    slideshow: {
      loading: slideshowLoading,
      visible: slideshowVisible,
      outfits: slideshowOutfits,
      images: slideshowImages,
      currentIndex: currentSlideIndex,
      isAutoPlaying,
      onClose: closeSlideshow,
      onNext: () => handleManualNavigation('next'),
      onPrev: () => handleManualNavigation('prev'),
      onToggleAutoPlay: toggleAutoPlay,
    },
    lookbook: {
      pickerVisible: lookbookPickerVisible,
      setPickerVisible: setLookbookPickerVisible,
      title: lookbookTitle,
      setTitle: setLookbookTitle,
      description: lookbookDescription,
      setDescription: setLookbookDescription,
      visibility: lookbookVisibility,
      setVisibility: setLookbookVisibility,
      saving: lookbookSaving,
      selectedOutfitCount: selectedOutfitIds.size,
      onCreateLookbook: handleCreateLookbook,
      userLookbooks,
      loadingLookbooks,
      selectedLookbookId,
      setSelectedLookbookId,
      onAddToExistingLookbook: handleAddToExistingLookbook,
    },
  });

  // Loading state
  if (loading && outfits.length === 0) {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner text="Loading outfits..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OutfitsHeaderSection
        headerReady={headerReady}
        headerHeight={headerHeight}
        headerOpacity={headerOpacity}
        headerTranslate={headerTranslate}
        uiHidden={uiHidden}
        onHeaderLayout={handleHeaderLayout}
        selectionMode={selectionMode}
        selectedOutfits={selectedOutfitsForBar}
        selectionCount={selectedOutfitIds.size}
        isSaving={lookbookSaving}
        onRemoveOutfit={toggleOutfitSelection}
        onExitSelection={exitSelectionMode}
        onOpenPicker={() => setLookbookPickerVisible(true)}
        activeTab={activeTab}
        showTabLabels={showTabLabels}
        activeView={activeView}
        onChangeTab={handleTabChange}
        onChangeView={setActiveView}
        showViewToggle={SHOW_VIEW_TOGGLE}
        searchQuery={filters.searchQuery}
        onSearchChange={(text) => updateFilter('searchQuery', text)}
        onOpenSort={() => setShowSortModal(true)}
        hasActiveFilters={filters.showFavoritesOnly}
        showSearch
        styles={styles}
      />


      {activeTab === 'my_outfits' ? (
        <View style={commonStyles.container}>
          <OutfitsMyOutfitsTab
            data={filteredOutfitsWithOccasions}
            activeView={activeView}
            renderGridItem={renderMyOutfitGridItem}
            renderFeedItem={renderMyOutfitFeedItem}
            listRef={myOutfitsFeedRef}
            onScroll={handleGridScroll}
            scrollEventThrottle={16}
            onLayout={handleMyOutfitsLayout}
            onScrollToIndexFailed={handleMyOutfitsScrollToIndexFailed}
            refreshing={refreshing}
            onRefresh={refresh}
            gridListStyle={styles.gridList}
            gridContentStyle={styles.gridContent}
            gridRowStyle={styles.gridRowLeft}
            feedListStyle={styles.feedListWrapper}
            feedContentStyle={styles.feedList}
            searchQuery={filters.searchQuery}
            showFavoritesOnly={filters.showFavoritesOnly}
          />
        </View>
      ) : activeTab === 'explore' ? (
        <OutfitsSocialTab
          activeView={activeView}
          gridFeed={applyGridFilters(exploreOutfitFeed)}
          feedList={applySavedFilter(exploreOutfitFeed)}
          gridImages={discoverImages}
          feedOutfitImages={discoverImages}
          feedLookbookImages={discoverLookbookImages}
          loading={discoverLoading}
          refreshing={exploreRefreshing}
          onRefresh={onDiscoverRefresh}
          onLoadMore={discoverHasMore ? loadMoreDiscover : undefined}
          hasMore={discoverHasMore}
          onGridItemPress={handleGridFeedOpen}
          selectionMode={selectionMode}
          selectedIds={selectedOutfitIds}
          onToggleSelection={toggleOutfitSelection}
          onActivateSelection={() => setSelectionMode(true)}
          onScroll={handleGridScroll}
          renderFeedItem={renderFeedItem}
          feedRef={discoverFeedRef}
          onLayout={() => handleFeedLayout('explore')}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          emptyCopy={{
            title: 'No posts yet',
            message: 'Check back later for new content from the community.',
          }}
          styles={styles}
        />
      ) : feedLoading && followingOutfitFeed.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <OutfitsSocialTab
          activeView={activeView}
          gridFeed={applyGridFilters(followingOutfitFeed)}
          feedList={applySavedFilter(followingOutfitFeed)}
          gridImages={followingGridImages}
          feedOutfitImages={outfitImages}
          feedLookbookImages={lookbookImages}
          loading={feedLoading}
          refreshing={followingRefreshing}
          onRefresh={onRefresh}
          onLoadMore={undefined}
          hasMore={false}
          onGridItemPress={handleGridFeedOpen}
          selectionMode={selectionMode}
          selectedIds={selectedOutfitIds}
          onToggleSelection={toggleOutfitSelection}
          onActivateSelection={() => setSelectionMode(true)}
          onScroll={handleGridScroll}
          renderFeedItem={renderFeedItem}
          feedRef={followingFeedRef}
          onLayout={() => handleFeedLayout('following')}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          emptyCopy={{
            title: 'No posts yet',
            message: 'Follow people to see their posts, or check out Explore!',
          }}
          styles={styles}
          alignLeft
        />
      )}

      <OutfitsAuxModals
        openOutfitMenuId={openOutfitMenuId}
        onCloseOutfitMenu={() => setOpenOutfitMenuId(null)}
        onEditOutfit={handleEditOutfit}
        onDuplicateOutfit={handleDuplicateOutfit}
        onArchiveOutfit={handleDeleteOutfit}
        findSimilarVisible={modals.showFindSimilar}
        onCloseFindSimilar={() => modals.setShowFindSimilar(false)}
        findSimilarEntityType={modals.findSimilarEntityType}
        findSimilarEntityId={modals.findSimilarEntityId}
        findSimilarCategoryId={modals.findSimilarCategoryId}
      />

      <OutfitsCalendarModals
        showDatePickerModal={showDatePickerModal}
        onCloseDatePicker={() => setShowDatePickerModal(false)}
        onSelectDate={handleDateSelect}
        form={form}
        presets={presets}
        loadingEntriesForDate={loadingEntriesForDate}
        createPreset={createPreset}
      />

      <OutfitsModalsContainer
        sortState={sortState}
        postMenuState={postMenuState}
        commentsState={commentsState}
        slideshowState={slideshowState}
        generationState={generationState}
        lookbookState={lookbookState}
      />
    </View>
  );
}

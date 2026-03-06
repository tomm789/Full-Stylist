/**
 * Outfits Screen (Refactored)
 * Main outfits screen with grid, explore, and scheduling flows.
 */
import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  useWindowDimensions,
} from 'react-native';
import type { FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
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
  useOutfitNavigation,
} from '@/hooks/outfits';
import {
  OutfitsModalsContainer,
  OutfitsCalendarModals,
  OutfitsAuxModals,
  OutfitsHeaderSection,
  OutfitsMyOutfitsTab,
  LookbooksTabContent,
  SocialTabContent,
} from '@/components/outfits';
import { OutfitScheduleStatus } from '@/types/outfits';
import {
  useFeed,
  useDiscoverFeed,
  useFeedSlideshow,
  useTryOnOutfit,
  useSocialModals,
} from '@/hooks/social';
import { useEngagementFeed } from '@/hooks/engagement';
import { useLookbookSelection, useLookbookTabs, useLookbooks, useSystemLookbooks } from '@/hooks/lookbooks';
import LookbookQuickAddModal from '@/components/outfits/LookbookQuickAddModal';
import LookbookSelectionBar from '@/components/outfits/LookbookSelectionBar';
import { LOOKBOOK_PANEL_COLLAPSED_HEIGHT } from '@/components/lookbooks/LookbookCreatorPanel';
import { SkeletonGrid } from '@/components/shared/loading';
import { layout, spacing } from '@/styles';
import { useSlotPresets } from '@/hooks/calendar';
import { useHideHeaderOnScroll } from '@/hooks/ui';
import createOutfitStyles from '@/styles/screens/outfits-tab.styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { useSearch } from '@/hooks';
import SearchOverlay from '@/components/search/SearchOverlay';
import { HeaderTabPill } from '@/components/shared';
import { OutfitsTabIcon } from '@/components/icons/tabs';
import SearchHeaderRow from '@/components/search/SearchHeaderRow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearchResultNavigation } from '@/hooks/search';
import { useOutfitsTabState, type OutfitsTab } from '@/hooks/outfits/useOutfitsTabState';

const SHOW_VIEW_TOGGLE = false;
const CREATOR_BAR_HEIGHT = 60;
const LOOKBOOK_PANEL_BOTTOM_OFFSET = spacing.xl + CREATOR_BAR_HEIGHT + spacing.sm;
const STATUS_LABELS: Record<OutfitScheduleStatus, string> = {
  planned: 'Planned',
  worn: 'Worn',
  skipped: 'Skipped',
};

export default function OutfitsScreen() {
  const colors = useThemeColors();
  const commonStyles = useMemo(() => createCommonStyles(colors), [colors]);
  const styles = useMemo(() => createOutfitStyles(colors), [colors]);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setTabBarDimmed, setTabBarOpacity } = useFloatingTabBar();
  const isFocused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();
  const showTabLabels = windowWidth >= layout.containerMaxWidth;
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const {
    searchQuery: globalSearchQuery,
    setSearchQuery: setGlobalSearchQuery,
    selectedFilter: searchSelectedFilter,
    setSelectedFilter: setSearchSelectedFilter,
    filteredResults: searchFilteredResults,
    loading: searchLoading,
  } = useSearch({ userId: user?.id });
  const [showSortModal, setShowSortModal] = useState(false);
  const [openOutfitMenuId, setOpenOutfitMenuId] = useState<string | null>(null);
  const {
    headerHeight,
    headerAnimatedStyle,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll: handleGridScroll,
    setHeaderVisible,
    resetScroll,
  } = useHideHeaderOnScroll({
    onVisibilityChange: (visible, timing) => {
      setTabBarDimmed(!visible, timing);
    },
  });

  useEffect(() => {
    if (!isFocused) {
      setTabBarDimmed(false);
    }
  }, [isFocused, setTabBarDimmed]);

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

  useEffect(() => {
    if (selectionMode) {
      setTabBarOpacity(0);
    } else {
      setTabBarOpacity(1);
    }
  }, [selectionMode, setTabBarOpacity]);

  const {
    pinnedLookbooks,
    addLookbookTab,
    removeLookbookTab,
    availableLookbooks,
    loadingLookbooks: loadingAvailableLookbooks,
  } = useLookbookTabs({ userId: user?.id });

  const {
    lookbooks: allLookbooks,
    thumbnails: lookbookThumbnails,
    loading: lookbooksLoading,
    loadingIds: lookbookLoadingIds,
    refresh: refreshLookbooks,
  } = useLookbooks({ userId: user?.id });

  const {
    systemLookbooks,
    loading: systemLookbooksLoading,
    refresh: refreshSystemLookbooks,
  } = useSystemLookbooks({ userId: user?.id });

  const sortedLookbooks = React.useMemo(() => {
    const pinnedIds = new Set(pinnedLookbooks.map((lb) => lb.id));
    return [...allLookbooks].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 0 : 1;
      const bPinned = pinnedIds.has(b.id) ? 0 : 1;
      return aPinned - bPinned;
    });
  }, [allLookbooks, pinnedLookbooks]);

  // ── Tab state ─────────────────────────────────────────────────────────────────
  const {
    activeTab,
    setActiveTab,
    coreTab,
    activeView,
    setActiveView,
    headerPillActiveId,
    isLookbooksActive,
    handleTabChange,
  } = useOutfitsTabState({ pinnedLookbooks });

  const [showLookbookAddModal, setShowLookbookAddModal] = useState(false);

  const handleSelectLookbookFromModal = useCallback((id: string, title: string) => {
    addLookbookTab(id, title);
    setActiveTab(`lookbook_${id}`);
    setSelectionMode(true);
  }, [addLookbookTab, setActiveTab, setSelectionMode]);

  const handleCreateNewFromModal = useCallback(() => {
    setSelectionMode(true);
    setLookbookPickerVisible(true);
  }, [setSelectionMode, setLookbookPickerVisible]);

  const handleRemoveLookbookTab = useCallback((id: string) => {
    removeLookbookTab(id);
    setActiveTab('my_outfits');
  }, [removeLookbookTab, setActiveTab]);

  // ── Search overlay ────────────────────────────────────────────────────────────
  const handleSearchToggle = useCallback((open: boolean) => {
    if (open) setSearchSelectedFilter('outfit');
    setSearchOverlayOpen(open);
    if (!open) setGlobalSearchQuery('');
  }, [setSearchSelectedFilter, setSearchOverlayOpen, setGlobalSearchQuery]);

  const { handleSearchResultPress } = useSearchResultNavigation();

  const { presets, createPreset } = useSlotPresets({ userId: user?.id });

  // ── Load outfits ──────────────────────────────────────────────────────────────
  const {
    filters,
    updateFilter,
    getSortLabel,
  } = useOutfitFilters([]);

  const { outfits, imageCache, loading, refreshing, refresh } = useOutfits({
    userId: user?.id,
    searchQuery: filters.searchQuery,
    favoritesOnly: false,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

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

  // ── Social feeds ──────────────────────────────────────────────────────────────
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
  const eng = useEngagementFeed(user?.id, {
    initialCounts: feedEngagementCounts,
    onRepost: async (postId) => { await refreshFeed(); },
  });
  const {
    counts: engagementCounts,
    handleLike,
    handleSave,
    handleRepost,
    updateCommentCount,
  } = eng;

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
    eng.seedCounts(feedEngagementCounts);
  }, [feedEngagementCounts]);

  React.useEffect(() => {
    modals.setFollowStatuses(feedFollowStatuses);
  }, [feedFollowStatuses]);

  const handleSwitchToFeed = useCallback(() => {
    setHeaderVisible(true);
    resetScroll();
    setActiveView('feed');
  }, [setHeaderVisible, resetScroll, setActiveView]);

  const handleOpenPostFeed = useCallback((postId: string, ownerUserId: string) => {
    router.push(`/users/${ownerUserId}/feed?postId=${postId}`);
  }, [router]);

  const handleOpenLookbook = useCallback((lookbookId: string) => {
    router.push(`/lookbooks/${lookbookId}`);
  }, [router]);

  const handleViewOutfit = useCallback((outfitId: string) => {
    router.push(`/outfits/${outfitId}/view`);
  }, [router]);

  const handleCreateLookbookFromTab = useCallback(() => {
    setSelectionMode(true);
    setLookbookPickerVisible(true);
  }, [setSelectionMode, setLookbookPickerVisible]);

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
    activeTab: coreTab,
    activeView,
    exploreFeed: exploreOutfitFeed,
    followingFeed: followingOutfitFeed,
    showGridOutfits,
    showGridLookbooks,
    selectedOccasions,
    showFavoritesOnly: filters.showFavoritesOnly,
    onSwitchToFeed: handleSwitchToFeed,
    onOpenPostFeed: handleOpenPostFeed,
    onOpenLookbook: handleOpenLookbook,
    outfitImages,
    lookbookImages,
    currentUserId: user?.id,
    engagementCounts,
    onLike: handleLike,
    onComment: modals.openComments,
    onRepost: handleRepost,
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
      activeTab: coreTab,
      allOutfits: outfits,
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

  // Reset header visibility + scroll tracking when switching tabs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    setHeaderVisible(true);
    resetScroll();
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setFollowingRefreshing(true);
    await Promise.all([refreshFeed(), loadSavedEntities()]);
    setFollowingRefreshing(false);
  }, [refreshFeed, loadSavedEntities, setFollowingRefreshing]);

  const onDiscoverRefresh = useCallback(async () => {
    setExploreRefreshing(true);
    await Promise.all([refreshDiscover(), loadSavedEntities()]);
    setExploreRefreshing(false);
  }, [refreshDiscover, loadSavedEntities, setExploreRefreshing]);

  const { handleOutfitPress } = useOutfitNavigation(
    router as any,
    filteredOutfitsWithOccasions,
    filters,
    getSortLabel
  );

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
      onOpenFeed: handleOutfitPress,
      onActivateSelection: () => setSelectionMode(true),
      onOpenMenu: setOpenOutfitMenuId,
      onPressOutfit: handleOutfitPress,
      onSchedulePress: openScheduleForOutfit,
      userId: user?.id,
    });

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
    onViewOutfit: handleViewOutfit,
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

  const listBottomPadding = selectionMode
    ? LOOKBOOK_PANEL_BOTTOM_OFFSET + LOOKBOOK_PANEL_COLLAPSED_HEIGHT + spacing.sm
    : spacing.xl + CREATOR_BAR_HEIGHT + spacing.md + insets.bottom;

  if (loading && outfits.length === 0) {
    return (
      <View style={commonStyles.loadingContainer}>
        <SkeletonGrid preset="outfit" count={12} />
      </View>
    );
  }

  // Shared props for the My Outfits / Lookbook tab view
  const myOutfitsTabProps = {
    data: filteredOutfitsWithOccasions,
    renderGridItem: renderMyOutfitGridItem,
    renderFeedItem: renderMyOutfitFeedItem,
    listRef: myOutfitsFeedRef,
    onScroll: handleGridScroll,
    scrollEventThrottle: 16,
    onLayout: handleMyOutfitsLayout,
    onScrollToIndexFailed: handleMyOutfitsScrollToIndexFailed,
    refreshing,
    onRefresh: refresh,
    feedListStyle: styles.feedListWrapper,
    feedContentStyle: [styles.feedList, { paddingBottom: listBottomPadding }],
    gridContentContainerStyle: { paddingBottom: listBottomPadding },
    searchQuery: filters.searchQuery,
    showFavoritesOnly: filters.showFavoritesOnly,
  } as const;

  return (
    <View style={styles.container}>
      <OutfitsHeaderSection
        headerReady={headerReady}
        headerHeight={headerHeight}
        headerAnimatedStyle={headerAnimatedStyle}
        uiHidden={uiHidden}
        onHeaderLayout={handleHeaderLayout}
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
        showSearch={false}
        styles={styles}
        pinnedLookbooks={pinnedLookbooks}
        onAddLookbookTab={() => setShowLookbookAddModal(true)}
        onRemoveLookbookTab={handleRemoveLookbookTab}
        occasionOptions={availableOccasions}
        selectedOccasions={selectedOccasions}
        onToggleOccasion={toggleOccasion}
        onClearOccasions={() => setSelectedOccasions([])}
        showOccasionPills={!isLookbooksActive}
        hideTabs={searchOverlayOpen}
        searchHeader={
          <SearchHeaderRow
            title="Outfits"
            leftIcon={isLookbooksActive ? 'add' : 'calendar-outline'}
            onLeftAction={
              isLookbooksActive
                ? () => setShowLookbookAddModal(true)
                : () => router.push('/calendar' as any)
            }
            centerSlot={
              <HeaderTabPill
                pills={[
                  {
                    id: 'my_outfits',
                    label: 'My Outfits',
                    icon: 'shirt-outline',
                    iconComponent: ({ size, color }) => (
                      <OutfitsTabIcon width={size} height={size} color={color} fill={color} />
                    ),
                  },
                  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
                  { id: 'following', label: 'Following', icon: 'people-outline' },
                  { id: 'lookbooks', label: 'Lookbooks', icon: 'book-outline' },
                ]}
                activeId={headerPillActiveId}
                onPress={(id) => handleTabChange(id as OutfitsTab)}
              />
            }
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
            onSearchToggle={handleSearchToggle}
            searchOpen={searchOverlayOpen}
            placeholder="Search outfits..."
            rightIcon="notifications-outline"
            onRightAction={() => router.push('/notifications' as any)}
          />
        }
      />

      <SearchOverlay
        open={searchOverlayOpen}
        width={windowWidth}
        topOffset={headerHeight}
        searchQuery={globalSearchQuery}
        loading={searchLoading}
        selectedFilter={searchSelectedFilter}
        filteredResults={searchFilteredResults}
        onFilterChange={setSearchSelectedFilter}
        onResultPress={handleSearchResultPress}
      />

      {activeTab === 'lookbooks' ? (
        <LookbooksTabContent
          systemLookbooks={systemLookbooks}
          sortedLookbooks={sortedLookbooks}
          lookbookThumbnails={lookbookThumbnails as Map<string, string | null>}
          lookbookLoadingIds={lookbookLoadingIds}
          lookbooksLoading={lookbooksLoading}
          allLookbooksEmpty={
            allLookbooks.length === 0 && systemLookbooks.every((lb) => lb.outfits.length === 0)
          }
          onScroll={handleGridScroll}
          onCreateLookbook={handleCreateLookbookFromTab}
          onNavigate={(path) => router.push(path as any)}
          listBottomPadding={listBottomPadding}
          styles={styles}
          commonStyles={commonStyles}
        />
      ) : activeTab.startsWith('lookbook_') || activeTab === 'my_outfits' ? (
        <OutfitsMyOutfitsTab
          {...myOutfitsTabProps}
          activeView={activeTab.startsWith('lookbook_') ? 'grid' : activeView}
        />
      ) : activeTab === 'explore' ? (
        <SocialTabContent
          feedType="explore"
          activeView={activeView as 'grid' | 'feed'}
          feed={exploreOutfitFeed}
          gridImages={discoverImages}
          feedOutfitImages={discoverImages}
          feedLookbookImages={discoverLookbookImages}
          loading={discoverLoading}
          refreshing={exploreRefreshing}
          onRefresh={onDiscoverRefresh}
          onLoadMore={discoverHasMore ? loadMoreDiscover : undefined}
          hasMore={discoverHasMore}
          applyGridFilters={applyGridFilters}
          applySavedFilter={applySavedFilter}
          onGridItemPress={handleGridFeedOpen}
          selectionMode={selectionMode}
          selectedIds={selectedOutfitIds}
          onToggleSelection={toggleOutfitSelection}
          onActivateSelection={() => setSelectionMode(true)}
          onScroll={handleGridScroll}
          renderFeedItem={renderFeedItem}
          feedRef={discoverFeedRef}
          onLayout={() => handleFeedLayout('explore' as any)}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          emptyCopy={{
            title: 'No posts yet',
            message: 'Check back later for new content from the community.',
          }}
          styles={styles}
          listBottomPadding={listBottomPadding}
          loadingColor={colors.primary}
        />
      ) : (
        <SocialTabContent
          feedType="following"
          activeView={activeView as 'grid' | 'feed'}
          feed={followingOutfitFeed}
          gridImages={followingGridImages}
          feedOutfitImages={outfitImages}
          feedLookbookImages={lookbookImages}
          loading={feedLoading}
          refreshing={followingRefreshing}
          onRefresh={onRefresh}
          onLoadMore={undefined}
          hasMore={false}
          applyGridFilters={applyGridFilters}
          applySavedFilter={applySavedFilter}
          onGridItemPress={handleGridFeedOpen}
          selectionMode={selectionMode}
          selectedIds={selectedOutfitIds}
          onToggleSelection={toggleOutfitSelection}
          onActivateSelection={() => setSelectionMode(true)}
          onScroll={handleGridScroll}
          renderFeedItem={renderFeedItem}
          feedRef={followingFeedRef}
          onLayout={() => handleFeedLayout('following' as any)}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          emptyCopy={{
            title: 'No posts yet',
            message: 'Follow people to see their posts, or check out Explore!',
          }}
          styles={styles}
          listBottomPadding={listBottomPadding}
          loadingColor={colors.primary}
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

      <LookbookQuickAddModal
        visible={showLookbookAddModal}
        onClose={() => setShowLookbookAddModal(false)}
        lookbooks={availableLookbooks}
        loading={loadingAvailableLookbooks}
        onSelectLookbook={handleSelectLookbookFromModal}
        onCreateNew={handleCreateNewFromModal}
      />

      {selectionMode && (
        <LookbookSelectionBar
          selectedOutfits={selectedOutfitsForBar}
          selectionCount={selectedOutfitIds.size}
          isSaving={lookbookSaving}
          onRemoveOutfit={toggleOutfitSelection}
          onExit={exitSelectionMode}
          onOpenPicker={() => setLookbookPickerVisible(true)}
          hintMessage={
            selectedOutfitIds.size === 0
              ? 'Long press an outfit to add it to your lookbook'
              : undefined
          }
        />
      )}
    </View>
  );
}

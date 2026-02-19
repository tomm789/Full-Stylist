/**
 * Outfits Screen (Refactored)
 * Main outfits screen with grid, explore, and scheduling flows.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import type { FlatList } from 'react-native';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
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
import { useLookbookSelection, useLookbookTabs } from '@/hooks/lookbooks';
import LookbookQuickAddModal from '@/components/outfits/LookbookQuickAddModal';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { layout, spacing } from '@/styles';
import { useSlotPresets } from '@/hooks/calendar';
import { useHideHeaderOnScroll } from '@/hooks/useHideHeaderOnScroll';
import createOutfitStyles from './styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { useSearch } from '@/hooks';
import SearchOverlay from '@/components/search/SearchOverlay';
import { HeaderTabPill } from '@/components/shared';
import { OutfitsTabIcon } from '@/components/icons/tabs';
import HeaderTitleRow from '@/components/tabs/HeaderTitleRow';
import HeaderIconButton from '@/components/shared/layout/HeaderIconButton';
import { useTabSearch } from '@/contexts/TabSearchContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type OutfitsTab = 'my_outfits' | 'explore' | 'following' | 'lookbooks' | `lookbook_${string}`;
type ViewMode = 'grid' | 'feed';
const SHOW_VIEW_TOGGLE = false;
const STATUS_LABELS: Record<OutfitScheduleStatus, string> = {
  planned: 'Planned',
  worn: 'Worn',
  skipped: 'Skipped',
};

export default function OutfitsScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createOutfitStyles(colors);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { registerTabSearch, clearTabSearch } = useTabSearch();
  const { setTabBarDimmed } = useFloatingTabBar();
  const isFocused = useIsFocused();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const showTabLabels = windowWidth >= layout.containerMaxWidth;
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const searchOpenRef = useRef(false);
  const {
    searchQuery: globalSearchQuery,
    setSearchQuery: setGlobalSearchQuery,
    selectedFilter: searchSelectedFilter,
    setSelectedFilter: setSearchSelectedFilter,
    filteredResults: searchFilteredResults,
    loading: searchLoading,
  } = useSearch({ userId: user?.id });
  const [showSortModal, setShowSortModal] = useState(false);
  const [activeTab, setActiveTab] = useState<OutfitsTab>('my_outfits');
  const [tabViews, setTabViews] = useState<Record<OutfitsTab, ViewMode>>({
    my_outfits: 'grid',
    explore: 'grid',
    following: 'grid',
    lookbooks: 'grid',
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

  const {
    pinnedLookbooks,
    addLookbookTab,
    removeLookbookTab,
    availableLookbooks,
    loadingLookbooks: loadingAvailableLookbooks,
  } = useLookbookTabs({ userId: user?.id });

  const [showLookbookAddModal, setShowLookbookAddModal] = useState(false);

  const handleSelectLookbookFromModal = useCallback((id: string, title: string) => {
    addLookbookTab(id, title);
    setActiveTab(`lookbook_${id}`);
    setSelectionMode(true);
  }, [addLookbookTab, setSelectionMode]);

  const handleCreateNewFromModal = useCallback(() => {
    setSelectionMode(true);
    setLookbookPickerVisible(true);
  }, [setSelectionMode, setLookbookPickerVisible]);

  const handleRemoveLookbookTab = useCallback((id: string) => {
    removeLookbookTab(id);
    setActiveTab('my_outfits');
  }, [removeLookbookTab]);

  React.useEffect(() => {
    if (!tab) return;
    const nextTab = Array.isArray(tab) ? tab[0] : tab;
    if (nextTab === 'my_outfits' || nextTab === 'explore' || nextTab === 'following' || nextTab === 'lookbooks') {
      setActiveTab(nextTab);
    }
  }, [tab]);

  // Filters state
  const {
    filters,
    updateFilter,
    getSortLabel,
  } = useOutfitFilters([]);

  useEffect(() => {
    if (!searchOpenRef.current && searchOverlayOpen) {
      setSearchSelectedFilter('outfit');
    }
    searchOpenRef.current = searchOverlayOpen;
  }, [searchOverlayOpen, setSearchSelectedFilter]);

  useEffect(() => {
    registerTabSearch(
      {
        query: globalSearchQuery,
        open: searchOverlayOpen,
        onQueryChange: setGlobalSearchQuery,
        onOpen: () => setSearchOverlayOpen(true),
        onClose: () => setSearchOverlayOpen(false),
        setDefaultFilter: () => setSearchSelectedFilter('outfit'),
      },
      pathname
    );

    return () => {
      clearTabSearch(pathname);
    };
  }, [
    clearTabSearch,
    globalSearchQuery,
    pathname,
    registerTabSearch,
    searchOverlayOpen,
    setGlobalSearchQuery,
    setSearchSelectedFilter,
  ]);

  // Search overlay is driven by local header state

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

  // Narrow tab for hooks that only understand the three fixed tabs
  const coreTab: 'my_outfits' | 'explore' | 'following' =
    activeTab.startsWith('lookbook_') || activeTab === 'lookbooks'
      ? 'my_outfits'
      : (activeTab as 'my_outfits' | 'explore' | 'following');

  const activeView = tabViews[coreTab];
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
    activeTab: coreTab,
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
    onOpenPostFeed: (postId, ownerUserId) => {
      router.push(`/users/${ownerUserId}/feed?postId=${postId}`);
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

  const handleTabChange = (tab: OutfitsTab) => {
    const nextTab =
      tab === 'lookbooks' && pinnedLookbooks.length > 0
        ? (`lookbook_${pinnedLookbooks[0].id}` as OutfitsTab)
        : tab;
    setActiveTab(nextTab);
    setTabViews((prev) => ({ ...prev, [nextTab]: 'grid' }));
  };

  const headerPillActiveId = activeTab.startsWith('lookbook_') ? 'lookbooks' : activeTab;
  const isLookbooksActive = activeTab === 'lookbooks' || activeTab.startsWith('lookbook_');

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

  const handleSearchResultPress = (result: (typeof searchFilteredResults)[0]) => {
    switch (result.type) {
      case 'user':
        router.push(`/users/${result.id}`);
        break;
      case 'outfit':
        router.push(`/outfits/${result.id}`);
        break;
      case 'lookbook':
        router.push(`/lookbooks/${result.id}`);
        break;
      case 'wardrobe_item':
        router.push(`/wardrobe/item/${result.id}`);
        break;
    }
  };

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
        showSearch={false}
        styles={styles}
        pinnedLookbooks={pinnedLookbooks}
        onAddLookbookTab={() => setShowLookbookAddModal(true)}
        onRemoveLookbookTab={handleRemoveLookbookTab}
        hintMessage={selectionMode && selectedOutfitIds.size === 0 ? 'Long press on an outfit to add it to your lookbook' : undefined}
        occasionOptions={availableOccasions}
        selectedOccasions={selectedOccasions}
        onToggleOccasion={toggleOccasion}
        onClearOccasions={() => setSelectedOccasions([])}
        showOccasionPills={!isLookbooksActive}
        hideTabs={searchOverlayOpen}
        searchHeader={
          <View style={[styles.searchHeaderRow, { paddingTop: insets.top + spacing.sm }]}>
            <HeaderTitleRow
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
              rightSlot={
                <HeaderIconButton
                  icon="notifications-outline"
                  onPress={() => router.push('/notifications' as any)}
                  accessibilityLabel="Notifications"
                />
              }
            />
          </View>
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

      {activeTab === 'lookbooks' && pinnedLookbooks.length === 0 ? (
        <View style={[commonStyles.container, styles.loadingContainer]}>
          <EmptyState
            icon="book-outline"
            title="Your lookbooks"
            message="Add a lookbook to get started."
            actionLabel="Add lookbook"
            onAction={() => setShowLookbookAddModal(true)}
          />
        </View>
      ) : activeTab.startsWith('lookbook_') ? (
        <View style={commonStyles.container}>
          <OutfitsMyOutfitsTab
            data={filteredOutfitsWithOccasions}
            activeView="grid"
            renderGridItem={renderMyOutfitGridItem}
            renderFeedItem={renderMyOutfitFeedItem}
            listRef={myOutfitsFeedRef}
            onScroll={handleGridScroll}
            scrollEventThrottle={16}
            onLayout={handleMyOutfitsLayout}
            onScrollToIndexFailed={handleMyOutfitsScrollToIndexFailed}
            refreshing={refreshing}
            onRefresh={refresh}
            feedListStyle={styles.feedListWrapper}
            feedContentStyle={styles.feedList}
            searchQuery={filters.searchQuery}
            showFavoritesOnly={filters.showFavoritesOnly}
          />
        </View>
      ) : activeTab === 'my_outfits' ? (
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
    </View>
  );
}

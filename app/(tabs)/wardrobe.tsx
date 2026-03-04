

/**
 * Wardrobe Screen
 * Main wardrobe screen using modular architecture.
 * Business logic extracted to: useOutfitDraft, useBodyShotGeneration, useCanvasLayout,
 *   useWardrobeTutorial, useWardrobeItemActions.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import Animated from 'react-native-reanimated';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FollowingWardrobesScreen from '@/app/social/following-wardrobes';

// Hooks
import { useWardrobe, useWardrobeItems, useFilters } from '@/hooks';
import { useOutfitGeneration, useBackgroundGridGenerator } from '@/hooks/outfits';
import { useOutfitSessionData } from '@/hooks/outfits/useOutfitSessionData';
import { useOutfitSessionNavigation } from '@/hooks/outfits/useOutfitSessionNavigation';
import { saveVariationAsOutfit } from '@/lib/outfits/sessions';
import { useOutfitDraft } from '@/hooks/wardrobe/useOutfitDraft';
import { useBodyShotGeneration } from '@/hooks/wardrobe/useBodyShotGeneration';
import { useCanvasLayout } from '@/hooks/wardrobe/useCanvasLayout';
import { useWardrobeTutorial } from '@/hooks/wardrobe/useWardrobeTutorial';
import { useWardrobeItemActions } from '@/hooks/wardrobe/useWardrobeItemActions';

// Shared Components
import {
  EmptyState,
  LoadingOverlay,
  HeaderTabPill,
} from '@/components/shared';
import { SkeletonGrid } from '@/components/shared/loading';
import type { ThumbnailItem } from '@/components/shared';
import { WardrobeTabIcon } from '@/components/icons/tabs';

// Wardrobe Components
import {
  CategoryPills,
  FilterDrawer,
  ItemGrid,
} from '@/components/wardrobe';
import TutorialScreen from '@/components/wardrobe/TutorialScreen';
import OutfitCreatorSection from '@/components/wardrobe/OutfitCreatorSection';
import { PANEL_COLLAPSED_HEIGHT } from '@/components/wardrobe/OutfitCreatorPanel';
import SessionPreviewStrip from '@/components/wardrobe/SessionPreviewStrip';
import WardrobeModalStack from '@/components/wardrobe/WardrobeModalStack';

// Styles & utils
import { theme } from '@/styles';
import { findConflictingItem } from '@/utils';
import { WardrobeItem } from '@/lib/wardrobe';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { useHideHeaderOnScroll } from '@/hooks/useHideHeaderOnScroll';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from './_wardrobe.styles';
import { useSearch } from '@/hooks';
import SearchOverlay from '@/components/search/SearchOverlay';
import { Ionicons } from '@expo/vector-icons';
import { useWardrobeCamera } from '@/hooks/wardrobe/useWardrobeCamera';
import SearchHeaderRow from '@/components/search/SearchHeaderRow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearchResultNavigation } from '@/hooks/useSearchResultNavigation';
import { useCreatorReset } from '@/hooks/wardrobe/useCreatorReset';
import { useOutfitSelectionFlow } from '@/hooks/wardrobe/useOutfitSelectionFlow';
import { useWardrobeCameraFlow } from '@/hooks/wardrobe/useWardrobeCameraFlow';
import { useGenerateOutfitFlow } from '@/hooks/wardrobe/useGenerateOutfitFlow';
import { showSuccessToast, showErrorToast } from '@/utils/toast';

const CREATOR_BAR_HEIGHT = 60;

export default function WardrobeScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setTabBarDimmed, setTabBarOpacity } = useFloatingTabBar();
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] = useState<'my' | 'following' | 'discover'>('my');

  // ── Wardrobe data ────────────────────────────────────────────────────────────
  const {
    wardrobeId,
    categories,
    subcategories,
    loadSubcategories,
    getCategoryById,
    loading: wardrobeLoading,
  } = useWardrobe(user?.id);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [outfitCreatorMode, setOutfitCreatorMode] = useState(false);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState<string[]>([]);
  const [selectedOutfitItemMap, setSelectedOutfitItemMap] = useState<
    Map<string, WardrobeItem>
  >(new Map());
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showOutfitCreatorOptionsModal, setShowOutfitCreatorOptionsModal] = useState(false);
  const [isCreatorExpanded, setIsCreatorExpanded] = useState(false);
  const [showHeadshotSelector, setShowHeadshotSelector] = useState(false);

  const { width: searchOverlayWidth, height: windowHeight } = useWindowDimensions();
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  const wardrobeCamera = useWardrobeCamera();

  // ── Sub-hooks ────────────────────────────────────────────────────────────────

  const bodyShot = useBodyShotGeneration({
    userId: user?.id,
    outfitCreatorMode,
  });

  const outfitDraft = useOutfitDraft({
    userId: user?.id,
    isFocused,
    selectedOutfitItems,
    selectedOutfitItemMap,
    currentHeadshotId: bodyShot.currentHeadshotId,
    onDraftRestored: (draft) => {
      const newMap = new Map<string, WardrobeItem>();
      draft.items.forEach((item) => newMap.set(item.id, item));
      setSelectedOutfitItemMap(newMap);
      setSelectedOutfitItems(draft.items.map((i) => i.id));
      if (draft.headshotId) bodyShot.setCurrentHeadshotId(draft.headshotId);
      setOutfitCreatorMode(true);
    },
  });

  const canvas = useCanvasLayout({
    userId: user?.id,
    selectedOutfitItems,
    isCreatorExpanded,
  });

  // ── Item data ────────────────────────────────────────────────────────────────
  const {
    allItems,
    imageCache,
    entityAttributesMap,
    tagsMap,
    loading,
    refresh,
    refreshing,
    hasLoaded,
  } = useWardrobeItems({
    wardrobeId,
    userId: user?.id,
    categoryId: selectedCategoryId || undefined,
    searchQuery: '',
  });

  const selectedItemsById = useMemo(() => {
    const lookup = new Map<string, WardrobeItem>();
    for (const item of allItems) lookup.set(item.id, item);
    for (const [id, item] of selectedOutfitItemMap.entries()) {
      if (!lookup.has(id)) lookup.set(id, item);
    }
    return lookup;
  }, [allItems, selectedOutfitItemMap]);

  const selectedWardrobeItems = useMemo(
    () =>
      selectedOutfitItems
        .map((id) => selectedItemsById.get(id))
        .filter((item): item is WardrobeItem => Boolean(item)),
    [selectedOutfitItems, selectedItemsById]
  );

  // ── Tutorial ─────────────────────────────────────────────────────────────────
  const tutorial = useWardrobeTutorial({
    userId: user?.id,
    hasLoaded,
    loading,
    wardrobeLoading,
    hasItems: allItems.length > 0,
  });

  // ── Item actions ─────────────────────────────────────────────────────────────
  const { handleToggleFavorite, handleModalDelete } = useWardrobeItemActions({
    userId: user?.id,
    selectedItem,
    setShowItemModal,
    refresh,
  });

  // ── Canvas-derived values ────────────────────────────────────────────────────
  const {
    outfitCanvasLayouts,
    outfitCanvasTrims,
    outfitCanvasTrimStatuses,
    handleCanvasLayoutChange,
    handleBringForward,
    handleSendBackward,
    activeOutfitCanvasLayouts,
    activeOutfitCanvasTrims,
    activeOutfitCanvasTrimStatuses,
    hasCustomCreatorLayout,
    isCanvasPreparing,
  } = canvas;

  // ── Background grid + outfit generation ─────────────────────────────────────
  const backgroundGrid = useBackgroundGridGenerator(
    selectedWardrobeItems,
    user?.id ?? null,
    hasCustomCreatorLayout
  );
  const pregenGridEnabled =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_PREGEND_GRID === 'true';

  // ── Session hooks ──────────────────────────────────────────────────────────
  const sessionData = useOutfitSessionData({
    userId: user?.id ?? null,
    enabled: outfitCreatorMode,
  });

  const sessionNav = useOutfitSessionNavigation({
    variations: sessionData.variations,
    variationUrls: sessionData.variationUrls,
    resolveImageUrl: sessionData.resolveImageUrl,
  });

  const handleVariationCreated = useCallback(() => {
    sessionData.refreshVariations();
  }, [sessionData.refreshVariations]);

  const { generating, progress, generatedOutfitId, generateOutfit, reset: resetGeneration } =
    useOutfitGeneration({
      userId: user?.id || '',
      categories,
      backgroundGrid:
        pregenGridEnabled && backgroundGrid && !hasCustomCreatorLayout
          ? { getStoredKeyOrAwaitPending: backgroundGrid.getStoredKeyOrAwaitPending }
          : null,
      onVariationCreated: handleVariationCreated,
    });

  // ── Filtering ────────────────────────────────────────────────────────────────
  const {
    filteredItems,
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    availableColors,
    availableMaterials,
    availableSizes,
    availableSeasons,
    availableBrands,
    availableConditions,
    availableEntityAttributes,
    availableTags,
  } = useFilters(allItems, user?.id, entityAttributesMap, tagsMap);

  // ── Header scroll hide ───────────────────────────────────────────────────────
  const {
    headerHeight,
    headerAnimatedStyle,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll: handleGridScroll,
  } = useHideHeaderOnScroll({
    onVisibilityChange: (visible, timing) => {
      if (outfitCreatorMode) return;
      setTabBarDimmed(!visible, timing);
    },
  });

  // ── Search ───────────────────────────────────────────────────────────────────
  const {
    searchQuery: globalSearchQuery,
    setSearchQuery: setGlobalSearchQuery,
    selectedFilter: searchSelectedFilter,
    setSelectedFilter: setSearchSelectedFilter,
    filteredResults: searchFilteredResults,
    loading: searchLoading,
  } = useSearch({ userId: user?.id });

  const handleSearchToggle = useCallback((open: boolean) => {
    if (open) setSearchSelectedFilter('wardrobe_item');
    setSearchOverlayOpen(open);
    if (!open) setGlobalSearchQuery('');
  }, [setSearchSelectedFilter, setSearchOverlayOpen, setGlobalSearchQuery]);

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Load subcategories when category changes.
  useEffect(() => {
    if (selectedCategoryId) loadSubcategories(selectedCategoryId);
    updateFilter('subcategoryId', null);
  }, [selectedCategoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab bar focus/blur.
  useEffect(() => {
    if (!isFocused) setTabBarDimmed(false);
  }, [isFocused, setTabBarDimmed]);

  // Hide/show tab bar based on outfit creator mode.
  useEffect(() => {
    if (outfitCreatorMode) {
      setTabBarDimmed(false);
      setTabBarOpacity(0);
    } else {
      setTabBarOpacity(1);
      setTabBarDimmed(false);
    }
  }, [outfitCreatorMode, setTabBarDimmed, setTabBarOpacity]);

  // Exit outfit creator when all items removed.
  useEffect(() => {
    if (!outfitCreatorMode) return;
    if (selectedOutfitItems.length > 0) return;
    resetOutfitCreatorState();
  }, [outfitCreatorMode, selectedOutfitItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session: auto-select latest variation after generation ─────────────────
  const [autoSelectNext, setAutoSelectNext] = useState(false);

  useEffect(() => {
    if (autoSelectNext && sessionNav.completedVariations.length > 0) {
      sessionNav.selectLatest();
      setAutoSelectNext(false);
    }
  }, [autoSelectNext, sessionNav.completedVariations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session: thumbnail data for the strip ──────────────────────────────────
  const thumbnailItems = useMemo<ThumbnailItem[]>(() => {
    return sessionNav.completedVariations.map((v) => ({
      id: v.id,
      imageUrl: sessionData.variationUrls.get(v.image_id!) ?? null,
      isActive: v.id === sessionNav.preview.variationId,
      isSaved: v.is_saved,
      status: v.status as ThumbnailItem['status'],
    }));
  }, [sessionNav.completedVariations, sessionData.variationUrls, sessionNav.preview.variationId]);

  const handleThumbnailSelect = useCallback((id: string) => {
    const variation = sessionData.variations.find((v) => v.id === id);
    if (variation) sessionNav.selectVariation(variation);
  }, [sessionData.variations, sessionNav.selectVariation]);

  const previewOutfitId = useMemo(() => {
    if (!sessionNav.preview.variationId) return null;
    const v = sessionData.variations.find((vi) => vi.id === sessionNav.preview.variationId);
    return v?.outfit_id ?? null;
  }, [sessionNav.preview.variationId, sessionData.variations]);

  const handleSaveVariation = useCallback(async (variationId: string) => {
    if (!user?.id) return;
    const newOutfitId = await saveVariationAsOutfit(variationId, user.id);
    if (newOutfitId) {
      sessionData.refreshVariations();
      showSuccessToast('Outfit saved as a copy.');
    } else {
      showErrorToast('Failed to save outfit.');
    }
  }, [user?.id, sessionData.refreshVariations]);

  // ── Camera navigation ────────────────────────────────────────────────────────
  const { handleOpenCamera, handleCameraImageReady, handleCameraClose, submittingItem } = useWardrobeCameraFlow({
    wardrobeCamera,
    router,
    setTabBarOpacity,
    userId: user?.id,
    wardrobeId,
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  const { resetOutfitCreatorState } = useCreatorReset({
    setSelectedOutfitItems,
    setSelectedOutfitItemMap,
    canvas,
    setIsCreatorExpanded,
    setOutfitCreatorMode,
    handleCategorySelect,
    updateFilter,
    sessionData,
    sessionNav,
    setAutoSelectNext,
  });

  const { handleOutfitSelectionAttempt, removeSelectedOutfitItem } = useOutfitSelectionFlow({
    selectedWardrobeItems,
    outfitCreatorMode,
    outfitDraft,
    getCategoryById: (categoryId) => getCategoryById(categoryId),
    setSelectedOutfitItems,
    setSelectedOutfitItemMap,
    setOutfitCreatorMode,
  });

  const { handleGenerateOutfit } = useGenerateOutfitFlow({
    selectedOutfitItems,
    selectedWardrobeItems,
    hasCustomCreatorLayout,
    activeOutfitCanvasLayouts,
    activeOutfitCanvasTrims,
    sessionData,
    generateOutfit,
    setAutoSelectNext,
  });

  const handleToggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCreatorExpanded((prev) => !prev);
  }, []);

  const handleSetExpanded = useCallback((value: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCreatorExpanded(value);
  }, []);

  const handleItemPress = (item: WardrobeItem) => {
    if (outfitCreatorMode) {
      handleOutfitSelectionAttempt(item, true);
    } else {
      setSelectedItem(item);
      setShowItemModal(true);
    }
  };

  const handleItemLongPress = (item: WardrobeItem) => {
    handleOutfitSelectionAttempt(item, true);
  };

  const handleModalOpenDetail = () => {
    if (!selectedItem) return;
    const itemIds = filteredItems.map((item) => item.id).join(',');
    router.push(`/wardrobe/item/${selectedItem.id}?itemIds=${itemIds}`);
    setTimeout(() => setShowItemModal(false), 50);
  };

  const handleModalEdit = () => {
    if (!selectedItem) return;
    router.push(`/wardrobe/item/${selectedItem.id}/edit`);
    setTimeout(() => setShowItemModal(false), 50);
  };

  const { handleSearchResultPress } = useSearchResultNavigation();

  // ── Render helpers ───────────────────────────────────────────────────────────

  const selectedItemsForBar = selectedOutfitItems
    .map((id) => ({
      id,
      imageUrl: imageCache.get(id) || null,
      trimStatus: activeOutfitCanvasTrimStatuses[id] ?? 'idle',
    }))
    .filter((item) => item !== null);

  const dimmedItemIds = outfitCreatorMode
    ? filteredItems
        .filter((item) => {
          if (selectedOutfitItems.includes(item.id)) return false;
          return Boolean(
            findConflictingItem(item, selectedWardrobeItems, (categoryId) =>
              getCategoryById(categoryId)?.name || ''
            )
          );
        })
        .map((item) => item.id)
    : [];

  // ── Loading / tutorial guards ─────────────────────────────────────────────────

  if (
    (wardrobeLoading || loading || (!hasLoaded && user?.id)) &&
    filteredItems.length === 0 &&
    activeTab === 'my'
  ) {
    return (
      <View style={commonStyles.loadingContainer}>
        <SkeletonGrid preset="wardrobe" count={15} />
      </View>
    );
  }

  if (tutorial.showFirstTimeTutorial && tutorial.tutorialChecked) {
    return (
      <TutorialScreen
        onStartPhoto={async () => {
          await tutorial.dismissFirstTimeTutorial();
          handleOpenCamera();
        }}
        onStartUpload={async () => {
          await tutorial.dismissFirstTimeTutorial();
          if (Platform.OS === 'web') {
            router.push('/wardrobe/add?action=upload');
          } else {
            // On mobile, open library picker then show crop editor via camera overlay
            handleOpenCamera();
          }
        }}
        onDismiss={tutorial.dismissFirstTimeTutorial}
      />
    );
  }

  const headerHeightPx = typeof headerHeight === 'number' ? headerHeight : 0;
  const creatorCanvasTop = Math.max(headerHeightPx + theme.spacing.xs, insets.top + 72);
  const panelBottomOffset = theme.spacing.xl + CREATOR_BAR_HEIGHT + theme.spacing.md;
  const expandedPanelHeight = Math.max(
    PANEL_COLLAPSED_HEIGHT + 100,
    windowHeight - creatorCanvasTop - panelBottomOffset
  );
  const isCreatorVisible = outfitCreatorMode && selectedOutfitItems.length > 0;
  const hasSessionPreview = isCreatorVisible && thumbnailItems.length > 0;
  // Extra bottom padding when the session preview strip is visible above the creator panel
  const sessionPreviewHeight = hasSessionPreview
    ? (sessionNav.preview.imageUrl ? 200 + theme.spacing.sm : 0) + 68 + 40
    : 0;
  const listBottomPadding = isCreatorVisible
    ? panelBottomOffset + PANEL_COLLAPSED_HEIGHT + theme.spacing.md + sessionPreviewHeight
    : theme.spacing.xl + CREATOR_BAR_HEIGHT + theme.spacing.md + insets.bottom;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={commonStyles.container}>
      <LoadingOverlay
        visible={PERF_MODE ? false : (generating || submittingItem)}
        message={submittingItem ? 'Adding item to wardrobe...' : (progress.message || 'Generating outfit...')}
      />

      <Animated.View
        style={[
          styles.headerContainer,
          { height: headerHeight },
          headerAnimatedStyle,
        ]}
        pointerEvents={uiHidden ? 'none' : 'auto'}
      >
        <View onLayout={handleHeaderLayout}>
          <SearchHeaderRow
            title="Wardrobe"
            leftIcon="camera-outline"
            onLeftAction={handleOpenCamera}
            centerSlot={
              <HeaderTabPill
                pills={[
                  {
                    id: 'my',
                    label: 'My Wardrobe',
                    icon: 'shirt-outline',
                    iconComponent: ({ size, color }) => (
                      <WardrobeTabIcon width={size} height={size} color={color} fill={color} />
                    ),
                  },
                  { id: 'following', label: 'Following', icon: 'people-outline' },
                  { id: 'discover', label: 'Discover', icon: 'compass-outline' },
                ]}
                activeId={activeTab}
                onPress={(id) => setActiveTab(id as 'my' | 'following' | 'discover')}
              />
            }
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
            onSearchToggle={handleSearchToggle}
            searchOpen={searchOverlayOpen}
            placeholder="Search wardrobe..."
            avatarUri={bodyShot.currentHeadshotUrl ?? undefined}
            avatarInitials={user?.email?.slice(0, 2).toUpperCase() ?? undefined}
            onProfile={() => router.push('/(tabs)/profile' as any)}
          />

          {/* Filter icon + Category Pills row */}
          <View style={styles.filterAndCategoriesRow}>
            {outfitDraft.hasDraft && !outfitCreatorMode && (
              <TouchableOpacity
                style={styles.draftButton}
                onPress={() => outfitDraft.restoreDraft()}
                accessibilityLabel="Open draft outfit"
              >
                <Ionicons name="bookmark" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
              onPress={() => setShowFilterDrawer(true)}
              accessibilityLabel="Filters"
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={hasActiveFilters ? colors.textLight : colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <CategoryPills
                categories={categories}
                subcategories={subcategories}
                selectedCategoryId={selectedCategoryId}
                selectedSubcategoryId={filters.subcategoryId}
                onSelectCategory={handleCategorySelect}
                onSelectSubcategory={(id) => updateFilter('subcategoryId', id)}
              />
            </View>
          </View>
        </View>
      </Animated.View>

      <SearchOverlay
        open={searchOverlayOpen}
        width={searchOverlayWidth}
        topOffset={headerHeight}
        searchQuery={globalSearchQuery}
        loading={searchLoading}
        selectedFilter={searchSelectedFilter}
        filteredResults={searchFilteredResults}
        onFilterChange={setSearchSelectedFilter}
        onResultPress={handleSearchResultPress}
      />

      {/* Items Grid */}
      {activeTab === 'my' ? (
        <ItemGrid
          items={filteredItems}
          imageCache={imageCache}
          selectedItems={selectedOutfitItems}
          dimmedItems={dimmedItemIds}
          onItemPress={handleItemPress}
          onItemLongPress={handleItemLongPress}
          onFavoritePress={handleToggleFavorite}
          onRefresh={refresh}
          refreshing={refreshing}
          emptyTitle={
            selectedCategoryId || hasActiveFilters
              ? 'No items found'
              : 'Your wardrobe is empty'
          }
          emptyActionLabel="Add your first item"
          onEmptyAction={handleOpenCamera}
          onScroll={handleGridScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: listBottomPadding }}
        />
      ) : activeTab === 'following' ? (
        <FollowingWardrobesScreen
          selectedCategoryId={selectedCategoryId}
          selectedSubcategoryId={filters.subcategoryId}
        />
      ) : (
        <View style={styles.placeholderContainer}>
          <EmptyState
            icon={activeTab === 'discover' ? 'search-outline' : 'people-outline'}
            title={activeTab === 'discover' ? 'Discover coming soon' : 'Following coming soon'}
            message={
              activeTab === 'discover'
                ? 'We are working on a wardrobe discovery feed.'
                : 'We are working on a feed of wardrobes from people you follow.'
            }
          />
        </View>
      )}

      {/* Filter Drawer */}
      {activeTab === 'my' && (
        <FilterDrawer
          visible={showFilterDrawer}
          onClose={() => setShowFilterDrawer(false)}
          filters={filters}
          onUpdateFilter={updateFilter}
          onClearAll={clearFilters}
          subcategories={subcategories}
          availableColors={availableColors}
          availableMaterials={availableMaterials}
          availableSizes={availableSizes}
          availableSeasons={availableSeasons}
          availableBrands={availableBrands}
          availableConditions={availableConditions}
          availableEntityAttributes={availableEntityAttributes}
          availableTags={availableTags}
        />
      )}

      {/* Session Preview + Thumbnail Strip */}
      {hasSessionPreview && (
        <SessionPreviewStrip
          previewImageUrl={sessionNav.preview.imageUrl}
          previewOutfitId={previewOutfitId}
          thumbnailItems={thumbnailItems}
          canNavigateBack={sessionNav.canNavigateBack}
          canNavigateForward={sessionNav.canNavigateForward}
          onThumbnailSelect={handleThumbnailSelect}
          onNavigateBack={() => sessionNav.handleNavigate('back')}
          onNavigateForward={() => sessionNav.handleNavigate('forward')}
          onSaveVariation={handleSaveVariation}
          onViewOutfit={(outfitId) => router.push(`/outfits/${outfitId}/view`)}
          onClose={resetOutfitCreatorState}
          bottomOffset={panelBottomOffset}
          panelCollapsedHeight={PANEL_COLLAPSED_HEIGHT}
        />
      )}

      {/* Outfit Creator Panel & Bar */}
      <OutfitCreatorSection
        visible={isCreatorVisible}
        isExpanded={isCreatorExpanded}
        onToggleExpanded={handleToggleExpanded}
        expandedHeight={expandedPanelHeight}
        bottomOffset={panelBottomOffset}
        selectedItems={selectedItemsForBar}
        selectedWardrobeItems={selectedWardrobeItems}
        categories={categories}
        onRemoveItem={(id) => {
          removeSelectedOutfitItem(id);
          setSelectedOutfitItems((prev) => prev.filter((i) => i !== id));
        }}
        onCategorySelect={(categoryId) => {
          handleSetExpanded(false);
          const nextCategoryId = selectedCategoryId === categoryId ? null : categoryId;
          handleCategorySelect(nextCategoryId);
        }}
        selectedCategoryId={selectedCategoryId}
        currentHeadshotUrl={bodyShot.currentHeadshotUrl}
        onHeadshotSelect={() => setShowHeadshotSelector(true)}
        isPreparing={isCanvasPreparing}
        layoutMap={outfitCanvasLayouts}
        trimMap={outfitCanvasTrims}
        onLayoutChange={handleCanvasLayoutChange}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        label={`Generate (${selectedOutfitItems.length})`}
        onGenerate={handleGenerateOutfit}
        onOptions={() => setShowOutfitCreatorOptionsModal(true)}
        isGenerating={generating}
        disabled={bodyShot.isBodyShotGenerating}
      />

      <WardrobeModalStack
        activeTab={activeTab}
        showItemModal={showItemModal}
        selectedItem={selectedItem}
        imageCache={imageCache}
        userId={user?.id}
        onCloseItemModal={() => setShowItemModal(false)}
        onItemAddToOutfit={(item) => handleOutfitSelectionAttempt(item, false)}
        onItemOpenDetail={handleModalOpenDetail}
        onItemEdit={handleModalEdit}
        onItemDelete={handleModalDelete}
        showCreatorOptionsModal={showOutfitCreatorOptionsModal}
        onCloseCreatorOptionsModal={() => setShowOutfitCreatorOptionsModal(false)}
        onCreatorExpand={handleSetExpanded}
        onSaveDraft={async () => {
          await outfitDraft.saveDraft();
          resetOutfitCreatorState();
          setShowOutfitCreatorOptionsModal(false);
        }}
        onResetCreator={() => {
          resetOutfitCreatorState();
          setShowOutfitCreatorOptionsModal(false);
        }}
        showHeadshotSelector={showHeadshotSelector}
        onCloseHeadshotSelector={() => setShowHeadshotSelector(false)}
        bodyShot={bodyShot}
        onNewHeadshot={async () => {
          await outfitDraft.saveDraft();
          setShowHeadshotSelector(false);
          resetOutfitCreatorState();
          await AsyncStorage.setItem('wardrobe_draft_restore_pending', '1');
          router.push('/(tabs)/hair-and-make-up?returnToWardrobe=1' as any);
        }}
        wardrobeCamera={wardrobeCamera}
        onCameraImageReady={handleCameraImageReady}
        onCameraClose={handleCameraClose}
      />
    </View>
  );
}

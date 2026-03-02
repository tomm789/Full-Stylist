

/**
 * Wardrobe Screen
 * Main wardrobe screen using modular architecture.
 * Business logic extracted to: useOutfitDraft, useBodyShotGeneration, useCanvasLayout,
 *   useWardrobeTutorial, useWardrobeItemActions.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Alert,
  Platform,
  Animated,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { useRouter, useLocalSearchParams } from 'expo-router';
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
  LoadingSpinner,
  HeaderTabPill,
  GenerationThumbnailStrip,
} from '@/components/shared';
import type { ThumbnailItem } from '@/components/shared';
import { Image } from 'expo-image';
import { WardrobeTabIcon } from '@/components/icons/tabs';

// Wardrobe Components
import {
  CategoryPills,
  FilterDrawer,
  ItemGrid,
  ItemDetailModal,
  OutfitCreatorOptionsModal,
  HeadshotSelectorModal,
} from '@/components/wardrobe';
import TutorialScreen from '@/components/wardrobe/TutorialScreen';
import OutfitCreatorSection from '@/components/wardrobe/OutfitCreatorSection';
import { PANEL_COLLAPSED_HEIGHT } from '@/components/wardrobe/OutfitCreatorPanel';

// Styles & utils
import { theme } from '@/styles';
import { findConflictingItem } from '@/utils';
import { WardrobeItem } from '@/lib/wardrobe';
import { logClientTiming } from '@/lib/perf/logClientTiming';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { useHideHeaderOnScroll } from '@/hooks/useHideHeaderOnScroll';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { createCommonStyles } from '@/styles/commonStyles';
import { createStyles } from './wardrobe.styles';
import { useSearch } from '@/hooks';
import SearchOverlay from '@/components/search/SearchOverlay';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';
import { Ionicons } from '@expo/vector-icons';
import SearchHeaderRow from '@/components/search/SearchHeaderRow';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearchResultNavigation } from '@/hooks/useSearchResultNavigation';

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
  const { addItemId } = useLocalSearchParams<{ addItemId?: string }>();
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

  const cameraNavLockRef = useRef(false);

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
    headerOpacity,
    headerTranslate,
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
      Alert.alert('Saved', 'Outfit saved as a copy.');
    } else {
      Alert.alert('Error', 'Failed to save outfit.');
    }
  }, [user?.id, sessionData.refreshVariations]);

  // ── Camera navigation ────────────────────────────────────────────────────────
  const handleOpenCamera = useCallback(() => {
    if (cameraNavLockRef.current) return;
    cameraNavLockRef.current = true;
    router.push('/wardrobe/add?action=photo' as any);
    setTimeout(() => { cameraNavLockRef.current = false; }, 700);
  }, [router]);

  const cameraSwipe = useEdgeSwipe({
    direction: 'left',
    onSwipe: handleOpenCamera,
    enabled:
      isFocused &&
      activeTab === 'my' &&
      !searchOverlayOpen &&
      !showItemModal &&
      !showHeadshotSelector &&
      !showFilterDrawer &&
      !isCreatorExpanded,
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  const upsertSelectedOutfitItem = useCallback((item: WardrobeItem) => {
    setSelectedOutfitItemMap((prev) => {
      const next = new Map(prev);
      next.set(item.id, item);
      return next;
    });
  }, []);

  const removeSelectedOutfitItem = useCallback((itemId: string) => {
    setSelectedOutfitItemMap((prev) => {
      if (!prev.has(itemId)) return prev;
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const resetOutfitCreatorState = useCallback(() => {
    setSelectedOutfitItems([]);
    setSelectedOutfitItemMap(new Map());
    canvas.setOutfitCanvasLayouts({});
    canvas.setOutfitCanvasTrims({});
    canvas.setOutfitCanvasTrimStatuses({});
    setIsCreatorExpanded(false);
    setOutfitCreatorMode(false);
    handleCategorySelect(null);
    updateFilter('subcategoryId', null);
    sessionData.endSession();
    sessionNav.clearPreview();
    setAutoSelectNext(false);
  }, [handleCategorySelect, updateFilter, canvas.setOutfitCanvasLayouts, canvas.setOutfitCanvasTrims, canvas.setOutfitCanvasTrimStatuses, sessionData.endSession, sessionNav.clearPreview]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleOutfitSelectionAttempt = (item: WardrobeItem, promptOnConflict: boolean) => {
    const conflictingItem = findConflictingItem(
      item,
      selectedWardrobeItems,
      (categoryId) => getCategoryById(categoryId)?.name || ''
    );

    if (conflictingItem && promptOnConflict) {
      Alert.alert(
        'Replace item?',
        `Replace ${conflictingItem.title} with ${item.title}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              removeSelectedOutfitItem(conflictingItem.id);
              upsertSelectedOutfitItem(item);
              setSelectedOutfitItems((prev) =>
                prev.filter((id) => id !== conflictingItem.id).concat(item.id)
              );
              if (!outfitCreatorMode) setOutfitCreatorMode(true);
            },
          },
        ]
      );
      return;
    }

    if (!outfitCreatorMode && outfitDraft.hasDraft) {
      Alert.alert(
        'You have a saved draft',
        'Open your saved outfit draft or start a new outfit?',
        [
          {
            text: 'Open Draft',
            onPress: () => {
              outfitDraft.restoreDraft().then(() => {
                upsertSelectedOutfitItem(item);
                setSelectedOutfitItems((prev) =>
                  prev.includes(item.id) ? prev : [...prev, item.id]
                );
              });
            },
          },
          {
            text: 'Start New',
            style: 'destructive',
            onPress: () => {
              outfitDraft.clearDraft();
              setOutfitCreatorMode(true);
              upsertSelectedOutfitItem(item);
              setSelectedOutfitItems([item.id]);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!outfitCreatorMode) setOutfitCreatorMode(true);
    setSelectedOutfitItems((prev) => {
      if (prev.includes(item.id)) {
        removeSelectedOutfitItem(item.id);
        return prev.filter((id) => id !== item.id);
      }
      upsertSelectedOutfitItem(item);
      return [...prev, item.id];
    });
  };

  const handleGenerateOutfit = async () => {
    if (selectedOutfitItems.length === 0) {
      Alert.alert('Error', 'Please select items for your outfit');
      return;
    }
    if (selectedWardrobeItems.length === 0) {
      Alert.alert('Error', 'Failed to load selected items');
      return;
    }

    // Ensure a session exists for variation tracking (lazy — first generation creates it)
    const sid = await sessionData.ensureSession();

    const result = await logClientTiming('outfit_generation_client', async () => {
      return generateOutfit(
        selectedWardrobeItems,
        hasCustomCreatorLayout ? activeOutfitCanvasLayouts : null,
        hasCustomCreatorLayout ? activeOutfitCanvasTrims : null,
        sid
      );
    });
    if (result.success && result.outfitId) {
      // Stay on wardrobe page — auto-select the latest variation once loaded
      setAutoSelectNext(true);
    } else {
      Alert.alert('Error', result.error || 'Failed to generate outfit');
    }
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
        <LoadingSpinner text="Loading wardrobe..." />
      </View>
    );
  }

  if (tutorial.showFirstTimeTutorial && tutorial.tutorialChecked) {
    return (
      <TutorialScreen
        onStartPhoto={async () => {
          await tutorial.dismissFirstTimeTutorial();
          router.push('/wardrobe/add?action=photo');
        }}
        onStartUpload={async () => {
          await tutorial.dismissFirstTimeTutorial();
          router.push('/wardrobe/add?action=upload');
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
        visible={PERF_MODE ? false : generating}
        message={progress.message || 'Generating outfit...'}
      />

      <Animated.View
        style={[
          styles.headerContainer,
          {
            height: headerHeight,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }],
          },
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
          onEmptyAction={() => router.push('/wardrobe/add')}
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

      {/* Item Detail Modal */}
      {activeTab === 'my' && (
        <ItemDetailModal
          visible={showItemModal}
          onClose={() => setShowItemModal(false)}
          item={selectedItem}
          imageUrl={selectedItem ? imageCache.get(selectedItem.id) || null : null}
          isOwner={Boolean(user && selectedItem && selectedItem.owner_user_id === user.id)}
          onAddToOutfit={() => {
            if (selectedItem) {
              handleOutfitSelectionAttempt(selectedItem, false);
              setShowItemModal(false);
              Alert.alert('Added to outfit', 'Tip: Long hold an item to add it to your outfit.');
            }
          }}
          onOpenDetail={handleModalOpenDetail}
          onEdit={handleModalEdit}
          onDelete={handleModalDelete}
        />
      )}

      {/* Session Preview + Thumbnail Strip */}
      {hasSessionPreview && (
        <View
          style={{
            position: 'absolute',
            bottom: panelBottomOffset + PANEL_COLLAPSED_HEIGHT + theme.spacing.sm,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm,
            zIndex: 14,
          }}
        >
          {sessionNav.preview.imageUrl && (
            <TouchableOpacity
              style={{
                width: '100%',
                height: 200,
                borderRadius: 12,
                overflow: 'hidden',
                marginBottom: theme.spacing.sm,
                backgroundColor: colors.backgroundSecondary,
              }}
              onPress={() =>
                previewOutfitId && router.push(`/outfits/${previewOutfitId}/view`)
              }
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: sessionNav.preview.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
              />
            </TouchableOpacity>
          )}
          <GenerationThumbnailStrip
            items={thumbnailItems}
            onSelect={handleThumbnailSelect}
            canNavigateBack={sessionNav.canNavigateBack}
            canNavigateForward={sessionNav.canNavigateForward}
            onNavigateBack={() => sessionNav.handleNavigate('back')}
            onNavigateForward={() => sessionNav.handleNavigate('forward')}
            onSavePress={handleSaveVariation}
            showSaveIndicator
          />
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: theme.spacing.md,
              paddingBottom: theme.spacing.xs,
            }}
          >
            {previewOutfitId && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                }}
                onPress={() => router.push(`/outfits/${previewOutfitId}/view`)}
              >
                <Ionicons name="eye-outline" size={16} color={colors.textPrimary} />
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                  View
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}
              onPress={resetOutfitCreatorState}
            >
              <Ionicons name="checkmark" size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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

      {/* Outfit Creator Options Modal */}
      <OutfitCreatorOptionsModal
        visible={showOutfitCreatorOptionsModal}
        onClose={() => setShowOutfitCreatorOptionsModal(false)}
        onExpand={() => handleSetExpanded(true)}
        onSaveAsDraft={async () => {
          await outfitDraft.saveDraft();
          resetOutfitCreatorState();
          setShowOutfitCreatorOptionsModal(false);
        }}
        onClearSelection={() => {
          resetOutfitCreatorState();
          setShowOutfitCreatorOptionsModal(false);
        }}
      />

      {/* Headshot Selector Modal */}
      <HeadshotSelectorModal
        visible={showHeadshotSelector}
        userId={user?.id ?? ''}
        currentHeadshotId={bodyShot.currentHeadshotId}
        currentBodyShotId={bodyShot.currentBodyShotId}
        headshots={bodyShot.availableHeadshots}
        onClose={() => setShowHeadshotSelector(false)}
        onCheckHeadshot={bodyShot.handleCheckHeadshot}
        onGenerateBodyShot={bodyShot.handleGenerateBodyShot}
        onSkipBodyShot={bodyShot.handleSkipBodyShot}
        loading={bodyShot.loadingHeadshots}
        onNewHeadshot={async () => {
          await outfitDraft.saveDraft();
          setShowHeadshotSelector(false);
          resetOutfitCreatorState();
          await AsyncStorage.setItem('wardrobe_draft_restore_pending', '1');
          router.push('/(tabs)/hair-and-make-up?returnToWardrobe=1' as any);
        }}
      />

      <PanGestureHandler enabled={cameraSwipe.enabled} onGestureEvent={cameraSwipe.onGestureEvent}>
        <View style={[styles.edgeSwipeGestureZone, { top: headerHeightPx }]} />
      </PanGestureHandler>
    </View>
  );
}

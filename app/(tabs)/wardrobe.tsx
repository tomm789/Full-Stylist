

/**
 * Wardrobe Screen - Refactored
 * Main wardrobe screen using modular architecture.
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, Platform, Animated, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FollowingWardrobesScreen from '@/app/social/following-wardrobes';

// Hooks - Business logic separated
import {
  useWardrobe,
  useWardrobeItems,
  useFilters,
} from '@/hooks';
import { useOutfitGeneration, useBackgroundGridGenerator } from '@/hooks/outfits';

// Shared Components
import { EmptyState, LoadingOverlay, LoadingSpinner, HeaderTabPill } from '@/components/shared';
import { WardrobeTabIcon } from '@/components/icons/tabs';

// Wardrobe Components
import {
  CategoryPills,
  FilterDrawer,
  ItemGrid,
  ItemDetailModal,
  OutfitCreatorBar,
  OutfitCreatorContainer,
  OutfitCreatorOptionsModal,
  HeadshotSelectorModal,
} from '@/components/wardrobe';

// Outfit Components (for generation progress)
import {
  GenerationProgressModal,
} from '@/components/outfits';

// Styles
import { theme } from '@/styles';

// Utils
import { findConflictingItem } from '@/utils';
import { supabase } from '@/lib/supabase';
import { WardrobeItem } from '@/lib/wardrobe';
import { getUserSettings } from '@/lib/settings';
import { logClientTiming } from '@/lib/perf/logClientTiming';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { useHideHeaderOnScroll } from '@/hooks/useHideHeaderOnScroll';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useFloatingTabBar } from '@/contexts/FloatingTabBarContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';
import { useSearch } from '@/hooks';
import SearchOverlay from '@/components/search/SearchOverlay';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';
import { Ionicons } from '@expo/vector-icons';
import HeaderTitleRow from '@/components/tabs/HeaderTitleRow';
import HeaderAvatarButton from '@/components/shared/layout/HeaderAvatarButton';
import { useTabSearch } from '@/contexts/TabSearchContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Minimal styles - most come from theme and commonStyles
  headerContainer: {
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: colors.background,
  },
  placeholderContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tutorialContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxxl,
    paddingBottom: theme.spacing.xxl,
    justifyContent: 'space-between',
  },
  tutorialContent: {
    gap: theme.spacing.lg,
  },
  tutorialTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  tutorialSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: colors.textSecondary,
  },
  tutorialPrimaryButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tutorialPrimaryButtonText: {
    color: colors.textLight,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tutorialSecondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tutorialSecondaryButtonText: {
    color: colors.textPrimary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tutorialLaterButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tutorialLaterText: {
    color: colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    textDecorationLine: 'underline',
  },
  filterAndCategoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
  },
  filterButton: {
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.xs,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});



export default function WardrobeScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { registerTabSearch, clearTabSearch } = useTabSearch();
  const { setTabBarDimmed, setTabBarOpacity } = useFloatingTabBar();
  const isFocused = useIsFocused();
  const { addItemId } = useLocalSearchParams<{ addItemId?: string }>();
  const [activeTab, setActiveTab] = useState<'my' | 'following' | 'discover'>('my');

  // === State Management via Hooks ===
  
  // Wardrobe data
  const { wardrobeId, categories, subcategories, loadSubcategories, getCategoryById, loading: wardrobeLoading } = useWardrobe(user?.id);

  // Local UI state (must be before useMemo/backgroundGrid that depend on selectedOutfitItems + allItems)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [outfitCreatorCategoryId, setOutfitCreatorCategoryId] = useState<string | null>(null);
  const wardrobeSearchQuery = '';
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [outfitCreatorMode, setOutfitCreatorMode] = useState(false);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showFirstTimeTutorial, setShowFirstTimeTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [showOutfitTipOnClose, setShowOutfitTipOnClose] = useState(false);
  const [showOutfitCreatorOptionsModal, setShowOutfitCreatorOptionsModal] = useState(false);

  // Headshot selector state
  const [showHeadshotSelector, setShowHeadshotSelector] = useState(false);
  const [currentHeadshotId, setCurrentHeadshotId] = useState<string | null>(null);
  const [currentHeadshotUrl, setCurrentHeadshotUrl] = useState<string | null>(null);
  const [availableHeadshots, setAvailableHeadshots] = useState<Array<{ id: string; url: string | null }>>([]);
  const [loadingHeadshots, setLoadingHeadshots] = useState(false);

  const { width: searchOverlayWidth } = useWindowDimensions();
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
      setTabBarDimmed(!visible, timing);
    },
  });



  const handleOpenCamera = useCallback(() => {
    router.push('/wardrobe/add?action=photo' as any);
  }, [router]);

  // Edge swipe: swipe from left edge to open camera
  const cameraSwipe = useEdgeSwipe({
    direction: 'left',
    onSwipe: handleOpenCamera,
    enabled: isFocused && !searchOverlayOpen,
  });

  useEffect(() => {
    if (!isFocused) {
      setTabBarDimmed(false);
    }
  }, [isFocused, setTabBarDimmed]);

  // Hide/show tab bar based on outfit creator mode
  useEffect(() => {
    if (outfitCreatorMode) {
      setTabBarOpacity(0); // Completely hide the pill
    } else {
      setTabBarOpacity(1); // Show the pill
    }
  }, [outfitCreatorMode, setTabBarOpacity]);

  // Fetch headshots and user settings when outfit creator mode is activated
  useEffect(() => {
    if (!outfitCreatorMode || !user?.id) return;

    const fetchHeadshots = async () => {
      setLoadingHeadshots(true);
      try {
        // Fetch user settings for current headshot
        const { data: userSettings } = await getUserSettings(user.id);
        if (userSettings?.body_shot_image_id) {
          setCurrentHeadshotId(userSettings.body_shot_image_id);
          // Fetch the image URL
          const { data: imageData } = await supabase
            .from('images')
            .select('storage_key, storage_bucket')
            .eq('id', userSettings.body_shot_image_id)
            .single();

          if (imageData) {
            const publicUrl = supabase.storage
              .from(imageData.storage_bucket || 'media')
              .getPublicUrl(imageData.storage_key).data.publicUrl;
            setCurrentHeadshotUrl(publicUrl);
          }
        }

        // Fetch all available headshots
        const { data: headshots } = await supabase
          .from('images')
          .select('id, storage_key, storage_bucket')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (headshots) {
          const headshotUrls = headshots.map((img: any) => ({
            id: img.id,
            url: supabase.storage
              .from(img.storage_bucket || 'media')
              .getPublicUrl(img.storage_key).data.publicUrl,
          }));
          setAvailableHeadshots(headshotUrls);
        }
      } catch (error) {
        console.error('Failed to fetch headshots:', error);
      } finally {
        setLoadingHeadshots(false);
      }
    };

    fetchHeadshots();
  }, [outfitCreatorMode, user?.id]);

  // Items data with caching (allItems required for selectedItemsForGeneration)
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
    categoryId: outfitCreatorMode && outfitCreatorCategoryId ? outfitCreatorCategoryId : selectedCategoryId,
    searchQuery: wardrobeSearchQuery,
  });

  // Selected items as WardrobeItem[] (for background grid + generate); memoized so background hook debounce is stable
  const selectedItemsForGeneration = useMemo(
    () =>
      selectedOutfitItems
        .map((id) => allItems.find((item) => item.id === id))
        .filter((item): item is WardrobeItem => Boolean(item)),
    [selectedOutfitItems, allItems]
  );

  // Background grid: pre-upload grid while user selects (gated by EXPO_PUBLIC_PREGEND_GRID, default OFF)
  const backgroundGrid = useBackgroundGridGenerator(
    selectedItemsForGeneration,
    user?.id ?? null
  );
  const pregenGridEnabled =
    typeof process !== 'undefined' && process.env.EXPO_PUBLIC_PREGEND_GRID === 'true';

  // Outfit generation: single path (grid once on Generate) when pregen off; can use pre-uploaded grid when pregen on
  const { generating, progress, generatedOutfitId, generateOutfit, reset: resetGeneration } = useOutfitGeneration({
    userId: user?.id || '',
    categories,
    backgroundGrid:
      pregenGridEnabled && backgroundGrid
        ? { getStoredKeyOrAwaitPending: backgroundGrid.getStoredKeyOrAwaitPending }
        : null,
  });

  // Filtering
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

  useEffect(() => {
    if (!searchOpenRef.current && searchOverlayOpen) {
      setSearchSelectedFilter('wardrobe_item');
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
        setDefaultFilter: () => setSearchSelectedFilter('wardrobe_item'),
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

  // Load subcategories when category changes; clear subcategory filter
  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    }
    updateFilter('subcategoryId', null);
  }, [selectedCategoryId]);

  // === Handlers ===


  useEffect(() => {
    let isMounted = true;
    const checkTutorial = async () => {
      if (!user?.id) return;
      if (!hasLoaded || loading || wardrobeLoading) return;

      if (allItems.length > 0) {
        if (isMounted) {
          setShowFirstTimeTutorial(false);
          setTutorialChecked(true);
        }
        return;
      }

      try {
        const key = `wardrobe_first_time_dismissed:${user.id}`;
        const dismissed = await AsyncStorage.getItem(key);
        if (isMounted) {
          setShowFirstTimeTutorial(!dismissed);
          setTutorialChecked(true);
        }
      } catch (error) {
        console.warn('Failed to read wardrobe tutorial flag:', error);
        if (isMounted) {
          setShowFirstTimeTutorial(true);
          setTutorialChecked(true);
        }
      }
    };

    checkTutorial();
    return () => {
      isMounted = false;
    };
  }, [user?.id, hasLoaded, loading, wardrobeLoading, allItems.length]);

  const dismissFirstTimeTutorial = async () => {
    if (!user?.id) {
      setShowFirstTimeTutorial(false);
      setTutorialChecked(true);
      setShowOutfitTipOnClose(true);
      return;
    }

    const key = `wardrobe_first_time_dismissed:${user.id}`;
    try {
      await AsyncStorage.setItem(key, 'true');
    } catch (error) {
      console.warn('Failed to persist wardrobe tutorial flag:', error);
    }
    setShowFirstTimeTutorial(false);
    setTutorialChecked(true);
    setShowOutfitTipOnClose(true);
  };

  useEffect(() => {
    if (!showOutfitTipOnClose) return;
    if (showFirstTimeTutorial) return;
    Alert.alert('Tip', 'Long hold an item to add it to your outfit.');
    setShowOutfitTipOnClose(false);
  }, [showOutfitTipOnClose, showFirstTimeTutorial]);

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
    const selectedItems = selectedOutfitItems
      .map((id) => allItems.find((i) => i.id === id))
      .filter((i): i is WardrobeItem => Boolean(i));

    const conflictingItem = findConflictingItem(
      item,
      selectedItems,
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

    // Add to outfit
    if (!outfitCreatorMode) setOutfitCreatorMode(true);
    setSelectedOutfitItems((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  };

  const handleToggleFavorite = async (itemId: string, currentFavoriteStatus: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('wardrobe_items')
        .update({ is_favorite: !currentFavoriteStatus })
        .eq('id', itemId)
        .eq('owner_user_id', user.id);

      if (error) throw error;

      // Optimistic update handled by re-fetch
      refresh();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to toggle favorite');
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleSaveHeadshot = async (headshotId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          body_shot_image_id: headshotId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Update local state
      setCurrentHeadshotId(headshotId);
      const selectedHeadshot = availableHeadshots.find((h) => h.id === headshotId);
      if (selectedHeadshot) {
        setCurrentHeadshotUrl(selectedHeadshot.url);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save headshot selection');
      console.error('Failed to save headshot:', error);
    }
  };

  const handleSaveHeadshotAsDraft = async (headshotId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          body_shot_image_id: headshotId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Update local state
      setCurrentHeadshotId(headshotId);
      const selectedHeadshot = availableHeadshots.find((h) => h.id === headshotId);
      if (selectedHeadshot) {
        setCurrentHeadshotUrl(selectedHeadshot.url);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save headshot selection');
      console.error('Failed to save headshot as draft:', error);
    }
  };

  const handleClearHeadshotSelection = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          body_shot_image_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      // Update local state
      setCurrentHeadshotId(null);
      setCurrentHeadshotUrl(null);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to clear headshot selection');
      console.error('Failed to clear headshot selection:', error);
    }
  };

  const handleGenerateOutfit = async () => {
    if (selectedOutfitItems.length === 0) {
      Alert.alert('Error', 'Please select items for your outfit');
      return;
    }

    // Get the actual wardrobe items from IDs
    const selectedItems = selectedOutfitItems
      .map((id) => allItems.find((item) => item.id === id))
      .filter((item): item is WardrobeItem => Boolean(item));

    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Failed to load selected items');
      return;
    }

    // Generate outfit using the hook
    const result = await logClientTiming('outfit_generation_client', async () => {
      return generateOutfit(selectedItems);
    });

    if (result.success && result.outfitId) {
      // Clear selection and exit outfit creator mode
      setOutfitCreatorMode(false);
      setSelectedOutfitItems([]);

      const navigateAt = Date.now();
      console.debug('[outfit_render_timing] navigate_to_view_at', { ts: navigateAt, outfitId: result.outfitId, traceId: result.renderTraceId });
      // Navigate to the outfit view page (renderTraceId for perf timeline + cache-bust)
      const query = result.renderTraceId ? `?renderTraceId=${encodeURIComponent(result.renderTraceId)}` : '';
      router.push(`/outfits/${result.outfitId}/view${query}`);
    } else {
      Alert.alert('Error', result.error || 'Failed to generate outfit');
    }
  };

  const handleModalOpenDetail = () => {
    if (!selectedItem) return;
    const itemIds = filteredItems.map((item) => item.id).join(',');
    setShowItemModal(false);
    router.push(`/wardrobe/item/${selectedItem.id}?itemIds=${itemIds}`);
  };

  const handleModalEdit = () => {
    if (!selectedItem) return;
    setShowItemModal(false);
    router.push(`/wardrobe/item/${selectedItem.id}/edit`);
  };

  const handleModalDelete = () => {
    if (!selectedItem || !user) return;
    if (selectedItem.owner_user_id !== user.id) return;

    const deleteAction = async () => {
      try {
        const { error } = await supabase
          .from('wardrobe_items')
          .update({ archived_at: new Date().toISOString() })
          .eq('id', selectedItem.id)
          .eq('owner_user_id', user.id);

        if (error) throw error;

        setShowItemModal(false);
        refresh();
        
        if (Platform.OS === 'web') {
          alert('Item deleted successfully');
        } else {
          Alert.alert('Success', 'Item deleted successfully');
        }
      } catch (error: any) {
        if (Platform.OS === 'web') {
          alert(error.message || 'Failed to delete item');
        } else {
          Alert.alert('Error', error.message || 'Failed to delete item');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        deleteAction();
      }
    } else {
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this item? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: deleteAction,
          },
        ]
      );
    }
  };

  // Get selected items for outfit creator bar
  const selectedItemsForBar = selectedOutfitItems
    .map((id) => ({
      id,
      imageUrl: imageCache.get(id) || null,
    }))
    .filter((item) => item !== null);

  // Determine dimmed items (conflicting with current selection in outfit mode)
  const dimmedItemIds = outfitCreatorMode
    ? filteredItems
        .filter((item) => {
          if (selectedOutfitItems.includes(item.id)) return false;
          const selectedItems = selectedOutfitItems
            .map((id) => allItems.find((i) => i.id === id))
            .filter((i): i is WardrobeItem => Boolean(i));
          return Boolean(
            findConflictingItem(item, selectedItems, (categoryId) =>
              getCategoryById(categoryId)?.name || ''
            )
          );
        })
        .map((item) => item.id)
    : [];

  // === Render ===

  if ((wardrobeLoading || loading || (!hasLoaded && user?.id)) && filteredItems.length === 0 && activeTab === 'my') {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner text="Loading wardrobe..." />
      </View>
    );
  }

  if (showFirstTimeTutorial && tutorialChecked) {
    return (
      <View style={styles.tutorialContainer}>
        <View style={styles.tutorialContent}>
          <Text style={styles.tutorialTitle}>Add your first wardrobe item</Text>
          <Text style={styles.tutorialSubtitle}>
            Take a photo or upload an item to start building your wardrobe.
          </Text>

          <TouchableOpacity
            style={styles.tutorialPrimaryButton}
            onPress={async () => {
              await dismissFirstTimeTutorial();
              router.push('/wardrobe/add?action=photo');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.tutorialPrimaryButtonText}>Take a photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tutorialSecondaryButton}
            onPress={async () => {
              await dismissFirstTimeTutorial();
              router.push('/wardrobe/add?action=upload');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.tutorialSecondaryButtonText}>Upload an item</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.tutorialLaterButton}
          onPress={dismissFirstTimeTutorial}
          activeOpacity={0.7}
        >
          <Text style={styles.tutorialLaterText}>Later</Text>
        </TouchableOpacity>
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
    <PanGestureHandler enabled={cameraSwipe.enabled} onGestureEvent={cameraSwipe.onGestureEvent}>
    <View style={commonStyles.container}>

      {/* Generation Progress Modal (hidden in PERF_MODE to measure UI overhead) */}
      <LoadingOverlay
        visible={PERF_MODE ? false : generating}
        message={progress.message || 'Generating outfit...'}
      />

      <Animated.View
        style={[
          styles.headerContainer,
          {
            height: headerReady ? headerHeight : undefined,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
        pointerEvents={uiHidden ? 'none' : 'auto'}
      >
        <View onLayout={handleHeaderLayout}>
        <View style={[styles.headerRow, { paddingTop: insets.top + theme.spacing.sm }]}>
          <HeaderTitleRow
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
            rightSlot={
              <HeaderAvatarButton
                uri={currentHeadshotUrl ?? undefined}
                initials={user?.email?.slice(0, 2).toUpperCase() ?? undefined}
                onPress={() => router.push('/(tabs)/profile' as any)}
                inline
              />
            }
          />
        </View>
        {/* Filter icon + Category Pills row */}
        <View style={styles.filterAndCategoriesRow}>
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
              onSelectCategory={setSelectedCategoryId}
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
          emptyTitle={wardrobeSearchQuery || selectedCategoryId || hasActiveFilters ? 'No items found' : 'Your wardrobe is empty'}
          emptyActionLabel="Add your first item"
          onEmptyAction={() => router.push('/wardrobe/add')}
          onScroll={handleGridScroll}
          scrollEventThrottle={16}
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

      {/* Outfit Creator Container & Bar (Bottom) */}
      {outfitCreatorMode && selectedOutfitItems.length > 0 && (() => {
        // Calculate which categories are already in the selection
        const selectedItemObjects = selectedOutfitItems
          .map((id) => allItems.find((i) => i.id === id))
          .filter((i): i is WardrobeItem => Boolean(i));

        const selectedCategoryIds = new Set(
          selectedItemObjects.map((item) => item.category_id)
        );

        return (
          <>
            {/* Container with selected items and category shortcuts */}
            <OutfitCreatorContainer
              selectedItems={selectedItemsForBar}
              categories={categories}
              onRemoveItem={(id) => setSelectedOutfitItems((prev) => prev.filter((i) => i !== id))}
              onCategorySelect={(categoryId) => {
                if (outfitCreatorCategoryId === categoryId) {
                  setOutfitCreatorCategoryId(null);
                } else {
                  setOutfitCreatorCategoryId(categoryId);
                }
              }}
              selectedCategoryId={outfitCreatorCategoryId}
              currentHeadshotUrl={currentHeadshotUrl}
              onHeadshotSelect={() => setShowHeadshotSelector(true)}
              selectedCategoryIds={selectedCategoryIds}
            />

            {/* Generate button bar */}
            <OutfitCreatorBar
              itemCount={selectedOutfitItems.length}
              onGenerate={handleGenerateOutfit}
              onOptions={() => setShowOutfitCreatorOptionsModal(true)}
              isGenerating={generating}
            />
          </>
        );
      })()}

      {/* Outfit Creator Options Modal */}
      <OutfitCreatorOptionsModal
        visible={showOutfitCreatorOptionsModal}
        onClose={() => setShowOutfitCreatorOptionsModal(false)}
        onClearSelection={() => {
          setSelectedOutfitItems([]);
          setOutfitCreatorMode(false);
          setOutfitCreatorCategoryId(null);
          setShowOutfitCreatorOptionsModal(false);
        }}
      />

      {/* Headshot Selector Modal */}
      <HeadshotSelectorModal
        visible={showHeadshotSelector}
        currentHeadshotId={currentHeadshotId}
        headshots={availableHeadshots}
        onClose={() => setShowHeadshotSelector(false)}
        onSave={handleSaveHeadshot}
        onSaveAsDraft={handleSaveHeadshotAsDraft}
        onClearSelection={handleClearHeadshotSelection}
        loading={loadingHeadshots}
      />
    </View>
    </PanGestureHandler>
  );
}

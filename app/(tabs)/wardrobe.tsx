/**
 * Wardrobe Screen - Refactored
 * Main wardrobe screen using modular architecture.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, Animated, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hooks - Business logic separated
import {
  useWardrobe,
  useWardrobeItems,
  useFilters,
} from '@/hooks';
import { useOutfitGeneration, useBackgroundGridGenerator } from '@/hooks/outfits';

// Shared Components
import { LoadingOverlay, LoadingSpinner } from '@/components/shared';

// Wardrobe Components
import {
  SearchBar,
  CategoryPills,
  FilterDrawer,
  ItemGrid,
  ItemDetailModal,
  OutfitCreatorBar,
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
import { logClientTiming } from '@/lib/perf/logClientTiming';
import { PERF_MODE } from '@/lib/perf/perfMode';
import { useHideHeaderOnScroll } from '@/hooks/useHideHeaderOnScroll';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';


export default function WardrobeScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const { user } = useAuth();
  const router = useRouter();
  const { addItemId } = useLocalSearchParams<{ addItemId?: string }>();

  // === State Management via Hooks ===
  
  // Wardrobe data
  const { wardrobeId, categories, getCategoryById, loading: wardrobeLoading } = useWardrobe(user?.id);

  // Local UI state (must be before useMemo/backgroundGrid that depend on selectedOutfitItems + allItems)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [outfitCreatorMode, setOutfitCreatorMode] = useState(false);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showFirstTimeTutorial, setShowFirstTimeTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [showOutfitTipOnClose, setShowOutfitTipOnClose] = useState(false);
  const {
    headerHeight,
    headerOpacity,
    headerTranslate,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll: handleGridScroll,
  } = useHideHeaderOnScroll();

  // Items data with caching (allItems required for selectedItemsForGeneration)
  const {
    allItems,
    imageCache,
    loading,
    refresh,
    refreshing,
    hasLoaded,
  } = useWardrobeItems({
    wardrobeId,
    userId: user?.id,
    categoryId: selectedCategoryId,
    searchQuery,
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
  } = useFilters(allItems, user?.id);

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

  if ((wardrobeLoading || loading || (!hasLoaded && user?.id)) && filteredItems.length === 0) {
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

  return (
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
        {/* Outfit Creator Bar */}
        {outfitCreatorMode && (
          <OutfitCreatorBar
            selectedItems={selectedItemsForBar}
            onRemoveItem={(id) => setSelectedOutfitItems((prev) => prev.filter((i) => i !== id))}
            onGenerate={handleGenerateOutfit}
            onExit={() => {
              setOutfitCreatorMode(false);
              setSelectedOutfitItems([]);
            }}
          />
        )}

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFilter={() => setShowFilterDrawer(true)}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Category Pills */}
        <CategoryPills
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          variant="category"
        />
        </View>
      </Animated.View>

      {/* Items Grid */}
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
        emptyTitle={searchQuery || selectedCategoryId || hasActiveFilters ? 'No items found' : 'Your wardrobe is empty'}
        emptyActionLabel="Add your first item"
        onEmptyAction={() => router.push('/wardrobe/add')}
        onScroll={handleGridScroll}
        scrollEventThrottle={16}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        visible={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        filters={filters}
        onUpdateFilter={updateFilter}
        onClearAll={clearFilters}
        availableColors={availableColors}
        availableMaterials={availableMaterials}
        availableSizes={availableSizes}
        availableSeasons={availableSeasons}
      />

      {/* Item Detail Modal */}
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
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  // Minimal styles - most come from theme and commonStyles
  headerContainer: {
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  tutorialContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.textPrimary,
  },
  tutorialSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  tutorialPrimaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tutorialPrimaryButtonText: {
    color: theme.colors.textLight,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tutorialSecondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  tutorialSecondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  tutorialLaterButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tutorialLaterText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    textDecorationLine: 'underline',
  },
});

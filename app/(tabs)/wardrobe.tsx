/**
 * Wardrobe Screen - REFACTORED
 * Main wardrobe screen using new modular architecture
 * 
 * BEFORE: 1400+ lines of mixed concerns
 * AFTER: ~250 lines of clean, focused code
 */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

// Hooks - Business logic separated
import {
  useWardrobe,
  useWardrobeItems,
  useFilters,
} from '@/hooks';
import { useOutfitGeneration } from '@/hooks/outfits';

// Shared Components
import { LoadingOverlay, EmptyState } from '@/components/shared';

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
import { theme, commonStyles } from '@/styles';

// Utils
import { findConflictingItem } from '@/utils';
import { supabase } from '@/lib/supabase';
import { WardrobeItem } from '@/lib/wardrobe';

const { colors } = theme;

export default function WardrobeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { addItemId } = useLocalSearchParams<{ addItemId?: string }>();

  // === State Management via Hooks ===
  
  // Wardrobe data
  const { wardrobeId, categories, getCategoryById } = useWardrobe(user?.id);
  
  // Outfit generation
  const { generating, progress, generatedOutfitId, generateOutfit, reset: resetGeneration } = useOutfitGeneration({
    userId: user?.id || '',
    categories,
  });
  
  // === Local UI State ===
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  
  // Outfit creator mode
  const [outfitCreatorMode, setOutfitCreatorMode] = useState(false);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState<string[]>([]);
  
  // Item modal
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);

  // Items data with caching
  const {
    allItems,
    imageCache,
    loading,
    refresh,
    refreshing,
  } = useWardrobeItems({
    wardrobeId,
    userId: user?.id,
    categoryId: selectedCategoryId,
    searchQuery,
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
    const result = await generateOutfit(selectedItems);

    if (result.success && result.outfitId) {
      // Clear selection and exit outfit creator mode
      setOutfitCreatorMode(false);
      setSelectedOutfitItems([]);

      // Navigate to the outfit view page
      router.push(`/outfits/${result.outfitId}/view`);
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
    router.push(`/wardrobe/item/${selectedItem.id}/edit`);
  };

  const handleModalDelete = async () => {
    if (!selectedItem || !user) return;
    if (selectedItem.owner_user_id !== user.id) return;

    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('wardrobe_items')
                .update({ archived_at: new Date().toISOString() })
                .eq('id', selectedItem.id)
                .eq('owner_user_id', user.id);

              if (error) throw error;

              Alert.alert('Success', 'Item deleted');
              setShowItemModal(false);
              refresh();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete item');
            }
          },
        },
      ]
    );
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

  return (
    <View style={commonStyles.container}>
      {/* Loading Overlay */}
      <LoadingOverlay visible={loading && filteredItems.length === 0} message="Loading wardrobe..." />

      {/* Generation Progress Modal */}
      <LoadingOverlay 
        visible={generating} 
        message={progress.message || 'Generating outfit...'} 
      />

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
        onAdd={() => router.push('/wardrobe/add')}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Category Pills */}
      <CategoryPills
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        variant="category"
      />

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

const styles = StyleSheet.create({
  // Minimal styles - most come from theme and commonStyles
});
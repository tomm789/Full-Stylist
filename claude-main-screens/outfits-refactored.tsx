/**
 * Outfits Screen (Refactored)
 * Main outfits screen with grid of user's outfits
 * 
 * BEFORE: 600+ lines
 * AFTER: ~150 lines (75% reduction)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useOutfits, useOutfitFilters } from '@/hooks/outfits';
import { OutfitCard, SortModal } from '@/components/outfits';
import {
  SearchBar,
  EmptyState,
  LoadingSpinner,
  PillButton,
} from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing } = theme;

export default function OutfitsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [showSortModal, setShowSortModal] = useState(false);

  // Filters state
  const {
    filters,
    filteredOutfits: outfitsToShow,
    updateFilter,
    getSortLabel,
  } = useOutfitFilters([]);

  // Load outfits with filters
  const { outfits, imageCache, loading, refreshing, refresh } = useOutfits({
    userId: user?.id,
    searchQuery: filters.searchQuery,
    favoritesOnly: filters.showFavoritesOnly,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // Use filtered outfits from the hook
  const { filteredOutfits } = useOutfitFilters(outfits);

  const handleOutfitPress = (outfitId: string) => {
    const outfitIds = filteredOutfits.map((o) => o.id).join(',');
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

  // Loading state
  if (loading && outfits.length === 0) {
    return (
      <View style={commonStyles.container}>
        <LoadingSpinner text="Loading outfits..." />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {/* Search Bar */}
      <SearchBar
        value={filters.searchQuery}
        onChangeText={(text) => updateFilter('searchQuery', text)}
        onAdd={() => router.push('/outfits/new')}
        placeholder="Search outfits..."
        showFilter={false}
      />

      {/* Filter Pills */}
      <View style={styles.filterBar}>
        <PillButton
          label="Favorites"
          icon={
            <Ionicons
              name={filters.showFavoritesOnly ? 'heart' : 'heart-outline'}
              size={16}
              color={filters.showFavoritesOnly ? colors.white : colors.textSecondary}
            />
          }
          selected={filters.showFavoritesOnly}
          onPress={() =>
            updateFilter('showFavoritesOnly', !filters.showFavoritesOnly)
          }
        />

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
          <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* Outfits Grid */}
      <FlatList
        data={filteredOutfits}
        renderItem={({ item }) => (
          <OutfitCard
            outfit={item}
            imageUrl={imageCache.get(item.id) || null}
            onPress={() => handleOutfitPress(item.id)}
            showRating={filters.sortBy === 'rating'}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={
              filters.searchQuery || filters.showFavoritesOnly
                ? 'No outfits found'
                : 'No outfits yet'
            }
            message={
              filters.searchQuery || filters.showFavoritesOnly
                ? 'Try adjusting your filters'
                : 'Create your first outfit to get started'
            }
            actionLabel={
              !filters.searchQuery && !filters.showFavoritesOnly
                ? 'Create outfit'
                : undefined
            }
            onAction={
              !filters.searchQuery && !filters.showFavoritesOnly
                ? () => router.push('/outfits/new')
                : undefined
            }
            icon="shirt-outline"
          />
        }
      />

      {/* Sort Modal */}
      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSortChange={(sortBy) => {
          updateFilter('sortBy', sortBy);
          setShowSortModal(false);
        }}
        onOrderToggle={() =>
          updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    paddingVertical: spacing.xs + spacing.xs / 2,
    borderRadius: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs + spacing.xs / 2,
  },
  sortButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs / 2,
  },
});

/**
 * ItemGrid Component
 * Grid layout for wardrobe items with pull-to-refresh
 */

import React from 'react';
import { FlatList, RefreshControl, StyleSheet, ViewStyle } from 'react-native';
import ItemCard from './ItemCard';
import { EmptyState } from '@/components/shared';
import { theme } from '@/styles';
import { WardrobeItem } from '@/lib/wardrobe';

const { spacing } = theme;

interface ItemGridProps {
  items: WardrobeItem[];
  imageCache: Map<string, string | null>;
  selectedItems?: string[];
  dimmedItems?: string[];
  onItemPress: (item: WardrobeItem) => void;
  onItemLongPress?: (item: WardrobeItem) => void;
  onFavoritePress?: (itemId: string, currentFavoriteStatus: boolean) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  showFavorite?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  numColumns?: number;
  style?: ViewStyle;
}

export default function ItemGrid({
  items,
  imageCache,
  selectedItems = [],
  dimmedItems = [],
  onItemPress,
  onItemLongPress,
  onFavoritePress,
  onRefresh,
  refreshing = false,
  showFavorite = true,
  emptyTitle = 'No items found',
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  numColumns = 2,
  style,
}: ItemGridProps) {
  const renderItem = ({ item }: { item: WardrobeItem }) => {
    const isSelected = selectedItems.includes(item.id);
    const isDimmed = dimmedItems.includes(item.id);

    // Missing key => loading; key present => resolved (string or null)
    const imageLoading = !imageCache.has(item.id);
    const imageUrl = imageCache.get(item.id) ?? null;

    return (
      <ItemCard
        item={item}
        imageUrl={imageUrl}
        imageLoading={imageLoading}
        selected={isSelected}
        dimmed={isDimmed}
        onPress={() => onItemPress(item)}
        onLongPress={onItemLongPress ? () => onItemLongPress(item) : undefined}
        onFavoritePress={
          onFavoritePress
            ? () => onFavoritePress(item.id, item.is_favorite || false)
            : undefined
        }
        showFavorite={showFavorite}
      />
    );
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        style={style}
      />
    );
  }

  return (
    <FlatList
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      contentContainerStyle={styles.list}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      style={style}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.sm,
  },
});
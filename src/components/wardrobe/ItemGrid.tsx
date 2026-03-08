/**
 * ItemGrid Component
 * Grid layout for wardrobe items with pull-to-refresh
 */

import React, { useCallback } from 'react';
import { Dimensions, FlatList, RefreshControl, StyleSheet, ViewStyle } from 'react-native';
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
  contentContainerStyle?: ViewStyle;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
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
  numColumns = 3,
  style,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle,
}: ItemGridProps) {
  const renderItem = React.useCallback(({ item }: { item: WardrobeItem }) => {
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
  }, [selectedItems, dimmedItems, imageCache, onItemPress, onItemLongPress, onFavoritePress, showFavorite]);

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const GAP = 1; // matches styles.row gap
  const PADDING = 1; // matches styles.list padding
  const ITEM_SIZE = (SCREEN_WIDTH - PADDING * 2 - GAP * (numColumns - 1)) / numColumns;
  const ROW_HEIGHT = ITEM_SIZE + GAP; // square items (aspectRatio: 1) + gap

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * Math.floor(index / numColumns),
      index,
    }),
    [ROW_HEIGHT, numColumns]
  );

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
      initialNumToRender={8}
      maxToRenderPerBatch={4}
      windowSize={5}
      numColumns={numColumns}
      getItemLayout={getItemLayout}
      contentContainerStyle={[styles.list, contentContainerStyle]}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
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
    padding: 1,
  },
  row: {
    gap: 1,
  },
});

/**
 * MyOutfitsSection Component
 * Handles the user's outfits list in grid or feed view.
 */

import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { OutfitWithRating } from '@/lib/outfits';
import { EmptyState } from '@/components/shared';
import { theme } from '@/styles';

const { colors } = theme;

type MyOutfitsSectionProps = {
  data: OutfitWithRating[];
  activeView: 'grid' | 'feed';
  renderGridItem: ({ item }: { item: OutfitWithRating }) => React.ReactElement;
  renderFeedItem: ({ item }: { item: OutfitWithRating }) => React.ReactElement;
  listRef: React.RefObject<FlatList<OutfitWithRating>>;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  onLayout?: () => void;
  onScrollToIndexFailed?: (info: { index: number; averageItemLength: number }) => void;
  refreshing: boolean;
  onRefresh: () => void;
  gridListStyle: object;
  gridContentStyle: object;
  gridRowStyle: object;
  feedListStyle: object;
  feedContentStyle: object;
  emptyTitle: string;
  emptyMessage: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
};

export default function MyOutfitsSection({
  data,
  activeView,
  renderGridItem,
  renderFeedItem,
  listRef,
  onScroll,
  scrollEventThrottle,
  onLayout,
  onScrollToIndexFailed,
  refreshing,
  onRefresh,
  gridListStyle,
  gridContentStyle,
  gridRowStyle,
  feedListStyle,
  feedContentStyle,
  emptyTitle,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
}: MyOutfitsSectionProps) {
  return (
    <FlatList
      ref={listRef}
      data={data}
      renderItem={activeView === 'grid' ? renderGridItem : renderFeedItem}
      keyExtractor={(item) => item.id}
      key={`my-outfits-${activeView}`}
      numColumns={activeView === 'grid' ? 3 : 1}
      style={activeView === 'grid' ? gridListStyle : feedListStyle}
      contentContainerStyle={activeView === 'grid' ? gridContentStyle : feedContentStyle}
      columnWrapperStyle={activeView === 'grid' ? gridRowStyle : undefined}
      onScroll={activeView === 'grid' ? onScroll : undefined}
      scrollEventThrottle={activeView === 'grid' ? scrollEventThrottle : undefined}
      onLayout={activeView === 'feed' ? onLayout : undefined}
      onScrollToIndexFailed={activeView === 'feed' ? onScrollToIndexFailed : undefined}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          icon="shirt-outline"
        />
      }
    />
  );
}

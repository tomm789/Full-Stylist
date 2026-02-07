/**
 * MyOutfitsSection Component
 * Handles the user's outfits list in grid or feed view.
 */

import React from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { OutfitWithRating } from '@/lib/outfits';
import { EmptyState } from '@/components/shared';
import { theme } from '@/styles';
import PostGrid from '@/components/social/PostGrid';
import { useThemeColors } from '@/contexts/ThemeContext';


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
  feedListStyle,
  feedContentStyle,
  emptyTitle,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
}: MyOutfitsSectionProps) {
  const colors = useThemeColors();
  return (
    activeView === 'grid' ? (
      <PostGrid
        data={data}
        renderItem={({ item }) => renderGridItem({ item })}
        keyExtractor={(item) => item.id}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        refreshing={refreshing}
        onRefresh={onRefresh}
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
    ) : (
      <FlatList
        ref={listRef}
        data={data}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        key={`my-outfits-${activeView}`}
        style={feedListStyle}
        contentContainerStyle={feedContentStyle}
        onLayout={onLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
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
    )
  );
}

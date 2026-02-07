/**
 * OutfitsSocialFeedSection Component
 * Shared Explore/Following feed renderer for grid and feed modes.
 */

import React from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { FeedItem } from '@/lib/posts';
import { DiscoverGrid } from '@/components/social';

type EmptyStateCopy = {
  title: string;
  message: string;
};

type SectionStyles = {
  feedListWrapper: StyleProp<ViewStyle>;
  feedList: StyleProp<ViewStyle>;
  emptyContainer: StyleProp<ViewStyle>;
  emptyText: StyleProp<TextStyle>;
  emptySubtext: StyleProp<TextStyle>;
};

type OutfitsSocialFeedSectionProps = {
  activeView: 'grid' | 'feed';
  gridFeed: FeedItem[];
  feedList: FeedItem[];
  gridImages: Map<string, string | null>;
  feedOutfitImages: Map<string, string | null>;
  feedLookbookImages: Map<string, any>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore?: boolean;
  onGridItemPress: (item: FeedItem) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (outfitId: string, imageUrl?: string | null) => void;
  onItemLongPress: (item: FeedItem) => void;
  onScroll: (event: any) => void;
  scrollEventThrottle?: number;
  renderFeedItem: (
    outfitImageMap: Map<string, string | null>,
    lookbookImageMap: Map<string, any>
  ) => ({ item }: { item: FeedItem }) => React.ReactElement | null;
  feedRef?: React.RefObject<FlatList<FeedItem>>;
  onLayout?: () => void;
  onScrollToIndexFailed?: (info: {
    index: number;
    averageItemLength: number;
  }) => void;
  emptyCopy: EmptyStateCopy;
  styles: SectionStyles;
  alignLeft?: boolean;
};

export default function OutfitsSocialFeedSection({
  activeView,
  gridFeed,
  feedList,
  gridImages,
  feedOutfitImages,
  feedLookbookImages,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  hasMore,
  onGridItemPress,
  selectionMode,
  selectedIds,
  onToggleSelection,
  onItemLongPress,
  onScroll,
  scrollEventThrottle = 16,
  renderFeedItem,
  feedRef,
  onLayout,
  onScrollToIndexFailed,
  emptyCopy,
  styles,
  alignLeft,
}: OutfitsSocialFeedSectionProps) {
  if (activeView === 'grid') {
    return (
      <DiscoverGrid
        feed={gridFeed}
        images={gridImages}
        loading={loading}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onLoadMore={onLoadMore}
        hasMore={Boolean(hasMore)}
        alignLeft={alignLeft}
        onItemPress={onGridItemPress}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        onItemLongPress={onItemLongPress}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      />
    );
  }

  return (
    <FlatList
      ref={feedRef}
      data={feedList}
      renderItem={renderFeedItem(feedOutfitImages, feedLookbookImages)}
      keyExtractor={(item) => item.id}
      style={styles.feedListWrapper}
      contentContainerStyle={styles.feedList}
      onLayout={onLayout}
      onScrollToIndexFailed={onScrollToIndexFailed}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyCopy.title}</Text>
          <Text style={styles.emptySubtext}>{emptyCopy.message}</Text>
        </View>
      }
    />
  );
}

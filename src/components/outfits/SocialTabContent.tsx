import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import type { FlatList } from 'react-native';
import type { FeedItem } from '@/lib/posts';
import OutfitsSocialTab from './OutfitsSocialTab';

interface SocialTabContentProps {
  feedType: 'explore' | 'following';
  activeView: 'grid' | 'feed';
  feed: FeedItem[];
  gridImages: Map<string, string | null>;
  feedOutfitImages: Map<string, string | null>;
  feedLookbookImages: Map<string, string | null>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  hasMore: boolean;
  applyGridFilters: (items: FeedItem[]) => FeedItem[];
  applySavedFilter: (items: FeedItem[]) => FeedItem[];
  onGridItemPress: (item: FeedItem) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (outfitId: string, imageUrl?: string | null) => void;
  onActivateSelection: () => void;
  onScroll: (event: any) => void;
  renderFeedItem: (
    outfitImageMap: Map<string, string | null>,
    lookbookImageMap: Map<string, any>
  ) => ({ item }: { item: FeedItem }) => React.ReactElement | null;
  feedRef?: React.RefObject<FlatList<FeedItem>>;
  onLayout: () => void;
  onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => void;
  emptyCopy: { title: string; message: string };
  styles: any;
  listBottomPadding: number;
  loadingColor: string;
}

export default function SocialTabContent({
  feedType,
  activeView,
  feed,
  gridImages,
  feedOutfitImages,
  feedLookbookImages,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  hasMore,
  applyGridFilters,
  applySavedFilter,
  onGridItemPress,
  selectionMode,
  selectedIds,
  onToggleSelection,
  onActivateSelection,
  onScroll,
  renderFeedItem,
  feedRef,
  onLayout,
  onScrollToIndexFailed,
  emptyCopy,
  styles,
  listBottomPadding,
  loadingColor,
}: SocialTabContentProps) {
  if (feedType === 'following' && loading && feed.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={loadingColor} />
      </View>
    );
  }

  return (
    <OutfitsSocialTab
      activeView={activeView}
      gridFeed={applyGridFilters(feed)}
      feedList={applySavedFilter(feed)}
      gridImages={gridImages}
      feedOutfitImages={feedOutfitImages}
      feedLookbookImages={feedLookbookImages}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      onGridItemPress={onGridItemPress}
      selectionMode={selectionMode}
      selectedIds={selectedIds}
      onToggleSelection={onToggleSelection}
      onActivateSelection={onActivateSelection}
      onScroll={onScroll}
      renderFeedItem={renderFeedItem}
      feedRef={feedRef}
      onLayout={onLayout}
      onScrollToIndexFailed={onScrollToIndexFailed}
      emptyCopy={emptyCopy}
      styles={styles}
      contentContainerStyle={{ paddingBottom: listBottomPadding }}
    />
  );
}

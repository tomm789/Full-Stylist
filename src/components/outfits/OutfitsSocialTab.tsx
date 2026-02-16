import React from 'react';
import { FlatList } from 'react-native';
import { FeedItem } from '@/lib/posts';
import OutfitsSocialFeedSection from './OutfitsSocialFeedSection';

export type OutfitsSocialTabProps = {
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
  onActivateSelection: () => void;
  onScroll: (event: any) => void;
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
  emptyCopy: {
    title: string;
    message: string;
  };
  styles: {
    feedListWrapper: any;
    feedList: any;
    emptyContainer: any;
    emptyText: any;
    emptySubtext: any;
  };
};

export default function OutfitsSocialTab({
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
  onActivateSelection,
  onScroll,
  renderFeedItem,
  feedRef,
  onLayout,
  onScrollToIndexFailed,
  emptyCopy,
  styles,
}: OutfitsSocialTabProps) {
  const handleItemLongPress = (item: FeedItem) => {
    if (!selectionMode) {
      onActivateSelection();
    }

    if (item.post?.entity_type === 'outfit') {
      const entity = item.entity?.outfit;
      if (entity) {
        const imageUrl = gridImages.get(entity.id) || null;
        onToggleSelection(entity.id, imageUrl);
      }
    }
  };

  return (
    <OutfitsSocialFeedSection
      activeView={activeView}
      gridFeed={gridFeed}
      feedList={feedList}
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
      onItemLongPress={handleItemLongPress}
      onScroll={onScroll}
      renderFeedItem={renderFeedItem}
      feedRef={feedRef}
      onLayout={onLayout}
      onScrollToIndexFailed={onScrollToIndexFailed}
      emptyCopy={emptyCopy}
      styles={styles}
    />
  );
}

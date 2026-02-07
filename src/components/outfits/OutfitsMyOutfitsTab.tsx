import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import MyOutfitsSection from './MyOutfitsSection';

export type OutfitsMyOutfitsTabProps = {
  data: any[];
  activeView: 'grid' | 'feed';
  renderGridItem: ({ item }: { item: any }) => React.ReactElement;
  renderFeedItem: ({ item }: { item: any }) => React.ReactElement;
  listRef: React.RefObject<any>;
  onScroll: (event: any) => void;
  scrollEventThrottle?: number;
  onLayout: () => void;
  onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => void;
  refreshing: boolean;
  onRefresh: () => void;
  feedListStyle: any;
  feedContentStyle: any;
  searchQuery: string;
  showFavoritesOnly: boolean;
};

export default function OutfitsMyOutfitsTab({
  data,
  activeView,
  renderGridItem,
  renderFeedItem,
  listRef,
  onScroll,
  scrollEventThrottle = 16,
  onLayout,
  onScrollToIndexFailed,
  refreshing,
  onRefresh,
  feedListStyle,
  feedContentStyle,
  searchQuery,
  showFavoritesOnly,
}: OutfitsMyOutfitsTabProps) {
  const router = useRouter();

  const showEmptyFilters = Boolean(searchQuery) || showFavoritesOnly;
  const emptyTitle = showEmptyFilters ? 'No outfits found' : 'No outfits yet';
  const emptyMessage = showEmptyFilters
    ? 'Try adjusting your filters'
    : 'Create your first outfit to get started';
  const emptyActionLabel = showEmptyFilters ? undefined : 'Create outfit';
  const onEmptyAction = showEmptyFilters
    ? undefined
    : () => router.push('/outfits/new');

  return (
    <View style={{ flex: 1 }}>
      <MyOutfitsSection
        data={data}
        activeView={activeView}
        renderGridItem={renderGridItem}
        renderFeedItem={renderFeedItem}
        listRef={listRef}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        onLayout={onLayout}
        onScrollToIndexFailed={onScrollToIndexFailed}
        refreshing={refreshing}
        onRefresh={onRefresh}
        feedListStyle={feedListStyle}
        feedContentStyle={feedContentStyle}
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
        emptyActionLabel={emptyActionLabel}
        onEmptyAction={onEmptyAction}
      />
    </View>
  );
}

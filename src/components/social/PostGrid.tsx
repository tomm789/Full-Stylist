import React from 'react';
import { FlatList, RefreshControl, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, layout, typography } from '@/styles';

export const postGridStyles = StyleSheet.create({
  gridList: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: layout.containerMaxWidth,
  },
  gridContent: {
    paddingBottom: spacing.lg,
  },
  gridRow: {
    gap: 1,
    justifyContent: 'flex-start',
  },
  gridItem: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: '33.333333%',
    maxWidth: '33.333333%',
    aspectRatio: 3 / 4,
    margin: 0.5,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundTertiary,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  selectionBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },
});

type PostGridProps<T> = {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement | null;
  keyExtractor: (item: T, index: number) => string;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  columnWrapperStyle?: ViewStyle;
  scrollEnabled?: boolean;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListEmptyComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
};

export default function PostGrid<T>({
  data,
  renderItem,
  keyExtractor,
  style,
  contentContainerStyle,
  columnWrapperStyle,
  scrollEnabled = true,
  onScroll,
  scrollEventThrottle,
  refreshing,
  onRefresh,
  onEndReached,
  onEndReachedThreshold,
  ListEmptyComponent,
  ListFooterComponent,
}: PostGridProps<T>) {
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={3}
      style={[postGridStyles.gridList, style]}
      contentContainerStyle={[postGridStyles.gridContent, contentContainerStyle]}
      columnWrapperStyle={[postGridStyles.gridRow, columnWrapperStyle]}
      scrollEnabled={scrollEnabled}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
        ) : undefined
      }
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
    />
  );
}

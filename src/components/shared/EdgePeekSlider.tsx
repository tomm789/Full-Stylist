/**
 * EdgePeekSlider
 * Horizontal snap slider with centered item and edge peeks.
 */

import React from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useEdgeSwipe } from '@/hooks/ui';

type RenderItemProps<T> = {
  item: T;
  index: number;
  width: number;
  height: number;
};

type EdgePeekSliderProps<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (props: RenderItemProps<T>) => React.ReactElement | null;
  itemWidthRatio?: number;
  aspectRatio?: number;
  gap?: number;
  initialIndex?: number;
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  extraData?: unknown;
  edgeSwipeEnabled?: boolean;
  edgeSwipeThreshold?: number;
  onEdgeSwipeStart?: () => void;
  enableHaptics?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
};

function EdgePeekSliderInner<T>({
  data,
  keyExtractor,
  renderItem,
  itemWidthRatio = 0.78,
  aspectRatio = 3 / 4,
  gap = 12,
  initialIndex = 0,
  activeIndex,
  onIndexChange,
  extraData,
  edgeSwipeEnabled = false,
  edgeSwipeThreshold = 24,
  onEdgeSwipeStart,
  enableHaptics = false,
  style,
  contentContainerStyle,
}: EdgePeekSliderProps<T>) {
  const { width: windowWidth } = useWindowDimensions();
  const itemWidth = Math.max(1, Math.round(windowWidth * itemWidthRatio));
  const itemHeight = Math.max(1, Math.round(itemWidth / aspectRatio));
  const baseSidePadding = (windowWidth - itemWidth) / 2;
  const sidePadding = Math.max(0, baseSidePadding - gap / 2);
  const snapInterval = itemWidth + gap;
  const listRef = React.useRef<FlatList<T>>(null);
  const lastIndexRef = React.useRef<number>(-1);
  // Track whether the last index change came from user scrolling so the
  // activeIndex useEffect doesn't fight the gesture by calling scrollToIndex.
  const scrollOriginRef = React.useRef<'user' | 'external'>('external');

  // Edge swipe detection — returns stable handler props, not a component
  const edgeSwipe = useEdgeSwipe({
    direction: 'left',
    onSwipe: () => {
      if (onEdgeSwipeStart && activeIndex === 0) {
        onEdgeSwipeStart();
      }
    },
    enabled: edgeSwipeEnabled && activeIndex === 0,
    edgeThreshold: edgeSwipeThreshold,
    swipeDistance: 50,
    minVelocity: 0.15,
    debounceMs: 500,
  });

  // Only programmatically scroll when the index change came from an external
  // source (e.g. tapping a grid thumbnail). When the user is swiping, the
  // FlatList already handles positioning — calling scrollToIndex on top of
  // that causes jank and "reload" flashes.
  React.useEffect(() => {
    if (activeIndex === undefined || activeIndex === null) return;
    if (activeIndex === lastIndexRef.current) return;

    if (scrollOriginRef.current === 'user') {
      // Index change originated from our own scroll handler — just sync the
      // ref so next external change is detected, but don't scroll.
      lastIndexRef.current = activeIndex;
      scrollOriginRef.current = 'external';
      return;
    }

    lastIndexRef.current = activeIndex;
    listRef.current?.scrollToIndex({ index: activeIndex, animated: true });
  }, [activeIndex]);

  // Track the visually-snapped index during scroll for haptics, but defer
  // the onIndexChange callback until momentum ends so state updates don't
  // cause re-renders while the FlatList is still animating.
  const pendingIndexRef = React.useRef<number | null>(null);

  const handleScroll = React.useCallback(
    (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const rawIndex = Math.round((offsetX + sidePadding) / snapInterval);
      const nextIndex = Math.max(0, Math.min(data.length - 1, rawIndex));
      if (nextIndex === lastIndexRef.current) return;
      lastIndexRef.current = nextIndex;
      pendingIndexRef.current = nextIndex;
      if (enableHaptics && Platform.OS !== 'web') {
        void Haptics.selectionAsync().catch(() => undefined);
      }
    },
    [sidePadding, snapInterval, data.length, enableHaptics],
  );

  const handleMomentumEnd = React.useCallback(() => {
    const idx = pendingIndexRef.current;
    if (idx !== null) {
      pendingIndexRef.current = null;
      scrollOriginRef.current = 'user';
      onIndexChange?.(idx);
    }
  }, [onIndexChange]);

  const itemStyle = React.useMemo(
    () => [staticStyles.itemWrap, { width: itemWidth, height: itemHeight, marginHorizontal: gap / 2 }],
    [itemWidth, itemHeight, gap],
  );

  const internalRenderItem = React.useCallback(
    ({ item, index }: { item: T; index: number }) => (
      <View style={itemStyle}>
        {renderItem({ item, index, width: itemWidth, height: itemHeight })}
      </View>
    ),
    [renderItem, itemStyle, itemWidth, itemHeight],
  );

  const getItemLayout = React.useCallback(
    (_: any, index: number) => ({
      length: snapInterval,
      offset: snapInterval * index,
      index,
    }),
    [snapInterval],
  );

  const handleScrollToIndexFailed = React.useCallback(() => {
    if (activeIndex === undefined || activeIndex === null) return;
    listRef.current?.scrollToIndex({ index: activeIndex, animated: true });
  }, [activeIndex]);

  const contentStyle = React.useMemo(
    () => [staticStyles.content, { paddingHorizontal: sidePadding }, contentContainerStyle],
    [sidePadding, contentContainerStyle],
  );

  return (
    <GestureDetector gesture={edgeSwipe.gesture}>
      <View style={[{ width: '100%' }, style]}>
        <FlatList
          ref={listRef}
          horizontal
          data={data}
          extraData={extraData}
          keyExtractor={keyExtractor}
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={5}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={snapInterval}
          snapToAlignment="start"
          initialScrollIndex={Math.max(0, Math.min(data.length - 1, initialIndex))}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          renderItem={internalRenderItem}
          contentContainerStyle={contentStyle}
          style={style}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      </View>
    </GestureDetector>
  );
}

const EdgePeekSlider = React.memo(EdgePeekSliderInner) as <T>(
  props: EdgePeekSliderProps<T>,
) => React.ReactElement;

export default EdgePeekSlider;

const staticStyles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  itemWrap: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});

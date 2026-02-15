/**
 * EdgePeekSlider
 * Horizontal snap slider with centered item and edge peeks.
 */

import React from 'react';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

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
  edgeSwipeEnabled?: boolean;
  edgeSwipeThreshold?: number;
  onEdgeSwipeStart?: () => void;
  enableHaptics?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
};

export default function EdgePeekSlider<T>({
  data,
  keyExtractor,
  renderItem,
  itemWidthRatio = 0.78,
  aspectRatio = 3 / 4,
  gap = 12,
  initialIndex = 0,
  activeIndex,
  onIndexChange,
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

  // Use proper gesture handler for edge swipe detection
  const { GestureView } = useEdgeSwipe({
    direction: 'left',
    onSwipe: () => {
      if (onEdgeSwipeStart && activeIndex === 0) {
        onEdgeSwipeStart();
      }
    },
    enabled: edgeSwipeEnabled && activeIndex === 0,
    edgeThreshold: edgeSwipeThreshold,
    swipeDistance: 50,
    minVelocity: 0.15, // Lower threshold for better UX
    haptic: enableHaptics,
    debounceMs: 500,
    style,
  });

  React.useEffect(() => {
    if (activeIndex === undefined || activeIndex === null) return;
    if (activeIndex === lastIndexRef.current) return;
    lastIndexRef.current = activeIndex;
    listRef.current?.scrollToIndex({ index: activeIndex, animated: true });
  }, [activeIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const rawIndex = Math.round((offsetX + sidePadding) / snapInterval);
    const nextIndex = Math.max(0, Math.min(data.length - 1, rawIndex));
    if (nextIndex === lastIndexRef.current) return;
    lastIndexRef.current = nextIndex;
    onIndexChange?.(nextIndex);
    if (enableHaptics && Platform.OS !== 'web') {
      void Haptics.selectionAsync().catch(() => undefined);
    }
  };

  return (
    <GestureView>
      <FlatList
        ref={listRef}
        horizontal
        data={data}
        keyExtractor={keyExtractor}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snapInterval}
        snapToAlignment="center"
        initialScrollIndex={Math.max(0, Math.min(data.length - 1, initialIndex))}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: snapInterval,
          offset: snapInterval * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View style={[styles.itemWrap, { width: itemWidth, height: itemHeight, marginHorizontal: gap / 2 }]}>
            {renderItem({ item, index, width: itemWidth, height: itemHeight })}
          </View>
        )}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: sidePadding },
          contentContainerStyle,
        ]}
        style={style}
        onScrollToIndexFailed={() => {
          if (activeIndex === undefined || activeIndex === null) return;
          listRef.current?.scrollToIndex({ index: activeIndex, animated: true });
        }}
      />
    </GestureView>
  );
}

const styles = StyleSheet.create({
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

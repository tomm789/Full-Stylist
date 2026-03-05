/**
 * SearchOverlay
 * Slides in the search results panel from the right.
 */

import React, { useMemo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from 'react-native-reanimated';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';
import type { SearchResult, SearchResultType } from '@/hooks/search';
import SearchResultsPanel from './SearchResultsPanel';

interface SearchOverlayProps {
  open: boolean;
  width: number;
  topOffset?: number;
  searchQuery: string;
  loading: boolean;
  selectedFilter: SearchResultType | 'all';
  filteredResults: SearchResult[];
  onFilterChange: (filter: SearchResultType | 'all') => void;
  onResultPress: (result: SearchResult) => void;
}

export default function SearchOverlay({
  open,
  width,
  topOffset = 0,
  searchQuery,
  loading,
  selectedFilter,
  filteredResults,
  onFilterChange,
  onResultPress,
}: SearchOverlayProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, { duration: 180 });
  }, [open]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [width || 0, 0]),
      },
    ],
  }));

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        styles.container,
        { top: topOffset },
        animatedStyle,
      ]}
    >
      <SearchResultsPanel
        searchQuery={searchQuery}
        loading={loading}
        selectedFilter={selectedFilter}
        filteredResults={filteredResults}
        onFilterChange={onFilterChange}
        onResultPress={onResultPress}
      />
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 30,
  },
});

/**
 * SearchOverlay
 * Slides in the search results panel from the right.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import type { SearchResult, SearchResultType } from '@/hooks/useSearch';
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
  const anim = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    });

    animation.start();

    // Cleanup: Stop animation and remove listeners on unmount or when dependencies change
    return () => {
      animation.stop();
      anim.stopAnimation();
      anim.removeAllListeners();
    };
  }, [anim, open]);

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[
        styles.container,
        { top: topOffset },
        {
          opacity: anim,
          transform: [
            {
              translateX: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [width || 0, 0],
              }),
            },
          ],
        },
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

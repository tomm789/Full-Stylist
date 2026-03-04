/**
 * SkeletonGrid
 * Configurable shimmer grid matching app grid layouts.
 *
 * Presets:
 *   wardrobe  — 3 cols, 1:1 aspect, 1px gap
 *   outfit    — 3 cols, 3:4 aspect, 0.5px gap
 *   lookbook  — horizontal scroll, 130px wide cards, 3:4 aspect
 */

import React from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';

const { spacing, borderRadius } = theme;

type Preset = 'wardrobe' | 'outfit' | 'lookbook';

interface SkeletonGridProps {
  /** Number of placeholder items to render */
  count?: number;
  /** Named layout preset */
  preset?: Preset;
  /** Override: number of columns (ignored for lookbook preset) */
  columns?: number;
  /** Override: aspect ratio of each item */
  aspectRatio?: number;
}

const PRESETS: Record<Preset, { columns: number; aspectRatio: number; gap: number; radius: number }> = {
  wardrobe: { columns: 3, aspectRatio: 1, gap: 1, radius: 0 },
  outfit: { columns: 3, aspectRatio: 3 / 4, gap: 0.5, radius: 0 },
  lookbook: { columns: 0, aspectRatio: 3 / 4, gap: spacing.sm, radius: borderRadius.md },
};

export default function SkeletonGrid({
  count = 12,
  preset = 'outfit',
  columns: columnsProp,
  aspectRatio: aspectRatioProp,
}: SkeletonGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const colors = useThemeColors();
  const isDark = (colors.background as string) !== '#fff' && (colors.background as string) !== '#ffffff';
  const colorMode = isDark ? 'dark' : 'light';

  const cfg = PRESETS[preset];
  const cols = columnsProp ?? cfg.columns;
  const ar = aspectRatioProp ?? cfg.aspectRatio;

  // Lookbook: horizontal scroll of fixed-width cards
  if (preset === 'lookbook') {
    const cardWidth = 130;
    const cardHeight = cardWidth / ar;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ marginRight: cfg.gap, width: cardWidth }}>
            <Skeleton
              colorMode={colorMode}
              width={cardWidth}
              height={cardHeight}
              radius={cfg.radius}
            />
          </View>
        ))}
      </ScrollView>
    );
  }

  // Grid layout
  const itemWidth = (screenWidth - cfg.gap * (cols - 1)) / cols;
  const itemHeight = itemWidth / ar;

  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: itemWidth,
            height: itemHeight,
            marginBottom: cfg.gap,
            marginRight: (i + 1) % cols === 0 ? 0 : cfg.gap,
          }}
        >
          <Skeleton
            colorMode={colorMode}
            width={itemWidth}
            height={itemHeight}
            radius={cfg.radius}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  horizontalContainer: {
    paddingHorizontal: spacing.xl,
  },
});

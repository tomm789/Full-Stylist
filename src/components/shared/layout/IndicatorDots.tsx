/**
 * IndicatorDots Component
 * Page indicator dots for carousels
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface IndicatorDotsProps {
  total: number;
  activeIndex: number;
  variant?: 'dots' | 'numeric';
  style?: ViewStyle;
}

export default function IndicatorDots({
  total,
  activeIndex,
  variant = 'numeric',
  style,
}: IndicatorDotsProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  if (variant === 'numeric') {
    return (
      <View style={[styles.numericContainer, style]}>
        <Text style={styles.numericText}>
          {activeIndex + 1} / {total}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.dotsContainer, style]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === activeIndex && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  numericContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  numericText: {
    color: colors.white,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 20,
  },
});

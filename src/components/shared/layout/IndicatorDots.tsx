/**
 * IndicatorDots Component
 * Page indicator dots for carousels
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

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
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (variant === 'numeric') {
    return (
      <BlurView intensity={25} tint="dark" style={[styles.numericContainer, style]}>
        <Text style={styles.numericText}>
          {activeIndex + 1} / {total}
        </Text>
      </BlurView>
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
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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

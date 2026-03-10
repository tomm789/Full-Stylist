/**
 * SkeletonProfileCard
 * Shimmer placeholder for profile header area.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from './Skeleton';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';

const { spacing } = theme;

export default function SkeletonProfileCard() {
  const colors = useThemeColors();
  const isDark = (colors.background as string) !== '#fff' && (colors.background as string) !== '#ffffff';
  const colorMode = isDark ? 'dark' : 'light';

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <Skeleton colorMode={colorMode} width={80} height={80} radius="round" />

      {/* Name + handle */}
      <View style={styles.textBlock}>
        <Skeleton colorMode={colorMode} width={160} height={18} radius={4} />
        <Skeleton colorMode={colorMode} width={100} height={14} radius={4} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Skeleton colorMode={colorMode} width={60} height={14} radius={4} />
        <Skeleton colorMode={colorMode} width={60} height={14} radius={4} />
        <Skeleton colorMode={colorMode} width={60} height={14} radius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xxl,
  },
});

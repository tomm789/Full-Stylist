/**
 * SkeletonBox
 * Base shimmer placeholder using moti/skeleton.
 */

import React from 'react';
import { Skeleton } from 'moti/skeleton';
import { useThemeColors } from '@/contexts/ThemeContext';

interface SkeletonBoxProps {
  width?: number;
  height?: number;
  radius?: number | 'square' | 'round';
}

export default function SkeletonBox({
  width,
  height = 20,
  radius = 4,
}: SkeletonBoxProps) {
  const colors = useThemeColors();
  const isDark = (colors.background as string) !== '#fff' && (colors.background as string) !== '#ffffff';

  return (
    <Skeleton
      colorMode={isDark ? 'dark' : 'light'}
      width={width}
      height={height}
      radius={radius}
    />
  );
}

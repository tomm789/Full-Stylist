/**
 * Skeleton
 * Lightweight shimmer placeholder using react-native-reanimated.
 * Drop-in replacement for moti/skeleton with the same API surface.
 */

import React, { useEffect } from 'react';
import { DimensionValue, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
  colorMode?: 'light' | 'dark';
  width?: DimensionValue;
  height?: number;
  radius?: number | 'square' | 'round';
}

const LIGHT_COLOR = '#e1e1e1';
const DARK_COLOR = '#2a2a2a';

export function Skeleton({
  colorMode = 'light',
  width,
  height = 20,
  radius = 4,
}: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const resolvedRadius =
    radius === 'round' ? (height ? height / 2 : 999) :
    radius === 'square' ? 0 :
    radius;

  const style: ViewStyle = {
    width,
    height,
    borderRadius: resolvedRadius,
    backgroundColor: colorMode === 'dark' ? DARK_COLOR : LIGHT_COLOR,
  };

  return <Animated.View style={[style, animatedStyle]} />;
}

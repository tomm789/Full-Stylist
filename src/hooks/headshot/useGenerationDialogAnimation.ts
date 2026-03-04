/**
 * useGenerationDialogAnimation
 * Manages the four staggered text-line animations shown in the white space
 * below the image during headshot generation.
 *
 * Migrated from legacy Animated API to react-native-reanimated v4.
 * Animated.stagger(2500, [...]) → multiple withDelay calls.
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';

export function useGenerationDialogAnimation(generating: boolean) {
  const line1Opacity = useSharedValue(0);
  const line2Opacity = useSharedValue(0);
  const line3Opacity = useSharedValue(0);
  const line4Opacity = useSharedValue(0);

  useEffect(() => {
    // Reset all lines
    cancelAnimation(line1Opacity);
    cancelAnimation(line2Opacity);
    cancelAnimation(line3Opacity);
    cancelAnimation(line4Opacity);
    line1Opacity.value = 0;
    line2Opacity.value = 0;
    line3Opacity.value = 0;
    line4Opacity.value = 0;

    if (!generating) return;

    // Stagger: each line starts 2500ms after the previous
    line1Opacity.value = withDelay(0, withTiming(1, { duration: 700 }));
    line2Opacity.value = withDelay(2500, withTiming(1, { duration: 700 }));
    line3Opacity.value = withDelay(5000, withTiming(1, { duration: 700 }));
    line4Opacity.value = withDelay(7500, withTiming(1, { duration: 700 }));
  }, [generating]);

  const dialogLine1Style = useAnimatedStyle(() => ({
    opacity: line1Opacity.value,
  }));

  const dialogLine2Style = useAnimatedStyle(() => ({
    opacity: line2Opacity.value,
  }));

  const dialogLine3Style = useAnimatedStyle(() => ({
    opacity: line3Opacity.value,
  }));

  const dialogLine4Style = useAnimatedStyle(() => ({
    opacity: line4Opacity.value,
  }));

  return {
    dialogLine1Style,
    dialogLine2Style,
    dialogLine3Style,
    dialogLine4Style,
  };
}

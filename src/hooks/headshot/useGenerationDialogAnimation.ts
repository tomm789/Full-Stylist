/**
 * useGenerationDialogAnimation
 * Manages the four staggered text-line Animated.Values shown in the white space
 * below the image during headshot generation.
 */

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function useGenerationDialogAnimation(generating: boolean) {
  const dialogLine1Opacity = useRef(new Animated.Value(0)).current;
  const dialogLine2Opacity = useRef(new Animated.Value(0)).current;
  const dialogLine3Opacity = useRef(new Animated.Value(0)).current;
  const dialogLine4Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    dialogLine1Opacity.setValue(0);
    dialogLine2Opacity.setValue(0);
    dialogLine3Opacity.setValue(0);
    dialogLine4Opacity.setValue(0);
    if (!generating) return;
    const anim = Animated.stagger(2500, [
      Animated.timing(dialogLine1Opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(dialogLine2Opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(dialogLine3Opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(dialogLine4Opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [generating]);

  return {
    dialogLine1Opacity,
    dialogLine2Opacity,
    dialogLine3Opacity,
    dialogLine4Opacity,
  };
}

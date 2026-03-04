/**
 * useGenerationAnimation
 * Drives the pulsing overlay shown while a headshot is being generated.
 * Returns three animated style objects: overlay style, icon scale style, icon opacity style.
 *
 * Migrated from legacy Animated API to react-native-reanimated v4.
 */

import { useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

type UseGenerationAnimationParams = {
  generating: boolean;
};

export function useGenerationAnimation({ generating }: UseGenerationAnimationParams) {
  const generatePulse = useSharedValue(0);

  useEffect(() => {
    if (!generating) {
      cancelAnimation(generatePulse);
      generatePulse.value = 0;
      return;
    }
    generatePulse.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1, // infinite repeats
    );
    return () => {
      cancelAnimation(generatePulse);
    };
  }, [generating]);

  const generateOverlayStyle = useAnimatedStyle(() => ({
    opacity: generatePulse.value * 0.65, // maps [0,1] → [0, 0.65]
  }));

  const generateIconScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + generatePulse.value * 0.12 }], // maps [0,1] → [1, 1.12]
  }));

  const generateIconOpacityStyle = useAnimatedStyle(() => ({
    opacity: 1 - generatePulse.value * 0.3, // maps [0,1] → [1, 0.7]
  }));

  return {
    generateOverlayStyle,
    generateIconScaleStyle,
    generateIconOpacityStyle,
    /** Raw shared value exposed for consumers that need custom interpolations */
    generatePulse,
  };
}

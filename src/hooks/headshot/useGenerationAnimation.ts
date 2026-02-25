/**
 * useGenerationAnimation
 * Drives the pulsing overlay shown while a headshot is being generated.
 * Returns three interpolated Animated values: overlay opacity, icon scale, icon opacity.
 */

import React from 'react';
import { Animated, Easing } from 'react-native';

type UseGenerationAnimationParams = {
  generating: boolean;
};

export function useGenerationAnimation({ generating }: UseGenerationAnimationParams) {
  const generatePulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!generating) {
      generatePulse.stopAnimation();
      generatePulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(generatePulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(generatePulse, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [generating, generatePulse]);

  const generateOverlayOpacity = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.65],
  });
  const generateIconScale = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });
  const generateIconOpacity = generatePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });

  return { generateOverlayOpacity, generateIconScale, generateIconOpacity };
}

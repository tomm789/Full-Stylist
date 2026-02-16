/**
 * useEdgeSwipe Hook
 * Detects swipe gestures from screen edges for actions like opening camera or navigation.
 * Uses react-native-gesture-handler for reliable gesture detection.
 */

import React, { useRef, useCallback } from 'react';
import { Dimensions, View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import type { ViewStyle } from 'react-native';

export type EdgeSwipeDirection = 'left' | 'right' | 'top' | 'bottom';

interface UseEdgeSwipeProps {
  direction: EdgeSwipeDirection;
  onSwipe: () => void;
  edgeThreshold?: number;
  swipeDistance?: number;
  minVelocity?: number;
  debounceMs?: number;
  style?: ViewStyle;
  enabled?: boolean;
}

interface UseEdgeSwipeReturn {
  GestureView: React.ComponentType<{ children: React.ReactNode }>;
}

export function useEdgeSwipe({
  direction,
  onSwipe,
  edgeThreshold = 30,
  swipeDistance = 50,
  minVelocity = 0.15,
  debounceMs = 500,
  style,
  enabled = true,
}: UseEdgeSwipeProps): UseEdgeSwipeReturn {
  const lastTriggerRef = useRef<number>(0);
  const gestureContext = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  const handleSwipe = useCallback(() => {
    const now = Date.now();
    if (now - lastTriggerRef.current < debounceMs) return;
    lastTriggerRef.current = now;
    onSwipe();
  }, [onSwipe, debounceMs]);

  const handleGestureEvent = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { absoluteX, absoluteY, translationX, translationY, velocityX, velocityY } = event.nativeEvent;

      // Capture start position on gesture begin
      if (translationX === 0 && translationY === 0) {
        gestureContext.current = { startX: absoluteX, startY: absoluteY };
        return;
      }

      const { startX, startY } = gestureContext.current;
      const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

      const isHorizontalDominant = Math.abs(velocityX) > Math.abs(velocityY);
      const isVerticalDominant = Math.abs(velocityY) > Math.abs(velocityX);

      if (direction === 'left') {
        const isFromEdge = startX < edgeThreshold;
        const isSwiping = translationX > swipeDistance && velocityX > minVelocity;
        if (isFromEdge && isSwiping && isHorizontalDominant) handleSwipe();
      } else if (direction === 'right') {
        const isFromEdge = startX > screenWidth - edgeThreshold;
        const isSwiping = translationX < -swipeDistance && velocityX < -minVelocity;
        if (isFromEdge && isSwiping && isHorizontalDominant) handleSwipe();
      } else if (direction === 'top') {
        const isFromEdge = startY < edgeThreshold;
        const isSwiping = translationY > swipeDistance && velocityY > minVelocity;
        if (isFromEdge && isSwiping && isVerticalDominant) handleSwipe();
      } else if (direction === 'bottom') {
        const isFromEdge = startY > screenHeight - edgeThreshold;
        const isSwiping = translationY < -swipeDistance && velocityY < -minVelocity;
        if (isFromEdge && isSwiping && isVerticalDominant) handleSwipe();
      }
    },
    [direction, edgeThreshold, swipeDistance, minVelocity, handleSwipe]
  );

  const GestureView = useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <PanGestureHandler enabled={enabled} onGestureEvent={handleGestureEvent}>
        <View style={[{ flex: 1 }, style]}>{children}</View>
      </PanGestureHandler>
    ),
    [handleGestureEvent, enabled, style]
  );

  return { GestureView };
}

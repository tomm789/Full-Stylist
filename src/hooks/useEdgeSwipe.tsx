/**
 * useEdgeSwipe Hook
 * Detects swipe gestures from screen edges for actions like opening camera or navigation.
 * Uses react-native-gesture-handler for reliable gesture detection.
 *
 * Returns a stable `gestureHandler` prop object to spread onto a PanGestureHandler,
 * rather than returning a component (which would cause remounts when callbacks change).
 */

import { useRef, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

export type EdgeSwipeDirection = 'left' | 'right' | 'top' | 'bottom';

interface UseEdgeSwipeProps {
  direction: EdgeSwipeDirection;
  onSwipe: () => void;
  edgeThreshold?: number;
  swipeDistance?: number;
  minVelocity?: number;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseEdgeSwipeReturn {
  enabled: boolean;
  onGestureEvent: (event: PanGestureHandlerGestureEvent) => void;
}

export function useEdgeSwipe({
  direction,
  onSwipe,
  edgeThreshold = 30,
  swipeDistance = 50,
  minVelocity = 0.15,
  debounceMs = 500,
  enabled = true,
}: UseEdgeSwipeProps): UseEdgeSwipeReturn {
  const lastTriggerRef = useRef<number>(0);
  const gestureContext = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  // Use a ref for onSwipe so the gesture handler callback stays stable
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

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

      let triggered = false;

      if (direction === 'left') {
        const isFromEdge = startX < edgeThreshold;
        const isSwiping = translationX > swipeDistance && velocityX > minVelocity;
        triggered = isFromEdge && isSwiping && isHorizontalDominant;
      } else if (direction === 'right') {
        const isFromEdge = startX > screenWidth - edgeThreshold;
        const isSwiping = translationX < -swipeDistance && velocityX < -minVelocity;
        triggered = isFromEdge && isSwiping && isHorizontalDominant;
      } else if (direction === 'top') {
        const isFromEdge = startY < edgeThreshold;
        const isSwiping = translationY > swipeDistance && velocityY > minVelocity;
        triggered = isFromEdge && isSwiping && isVerticalDominant;
      } else if (direction === 'bottom') {
        const isFromEdge = startY > screenHeight - edgeThreshold;
        const isSwiping = translationY < -swipeDistance && velocityY < -minVelocity;
        triggered = isFromEdge && isSwiping && isVerticalDominant;
      }

      if (triggered) {
        const now = Date.now();
        if (now - lastTriggerRef.current < debounceMs) return;
        lastTriggerRef.current = now;
        onSwipeRef.current();
      }
    },
    [direction, edgeThreshold, swipeDistance, minVelocity, debounceMs],
  );

  return { enabled, onGestureEvent: handleGestureEvent };
}

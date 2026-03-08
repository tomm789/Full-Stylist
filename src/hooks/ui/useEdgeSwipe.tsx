/**
 * useEdgeSwipe Hook
 * Detects swipe gestures from screen edges for actions like opening camera or navigation.
 * Uses react-native-gesture-handler modern Gesture API.
 *
 * Returns a configured Gesture.Pan() object for use with <GestureDetector>.
 */

import { useRef, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { Gesture, type GestureType } from 'react-native-gesture-handler';

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
  gesture: GestureType;
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
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Stable ref for onSwipe so gesture doesn't need to be recreated on callback changes
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .runOnJS(true)
        .onBegin((e) => {
          startPosRef.current = { x: e.absoluteX, y: e.absoluteY };
        })
        .onEnd((e) => {
          const { x: startX, y: startY } = startPosRef.current;
          const { width: screenWidth, height: screenHeight } =
            Dimensions.get('window');

          const isHorizontalDominant =
            Math.abs(e.velocityX) > Math.abs(e.velocityY);
          const isVerticalDominant =
            Math.abs(e.velocityY) > Math.abs(e.velocityX);

          let triggered = false;

          if (direction === 'left') {
            const isFromEdge = startX < edgeThreshold;
            const isSwiping =
              e.translationX > swipeDistance && e.velocityX > minVelocity;
            triggered = isFromEdge && isSwiping && isHorizontalDominant;
          } else if (direction === 'right') {
            const isFromEdge = startX > screenWidth - edgeThreshold;
            const isSwiping =
              e.translationX < -swipeDistance && e.velocityX < -minVelocity;
            triggered = isFromEdge && isSwiping && isHorizontalDominant;
          } else if (direction === 'top') {
            const isFromEdge = startY < edgeThreshold;
            const isSwiping =
              e.translationY > swipeDistance && e.velocityY > minVelocity;
            triggered = isFromEdge && isSwiping && isVerticalDominant;
          } else if (direction === 'bottom') {
            const isFromEdge = startY > screenHeight - edgeThreshold;
            const isSwiping =
              e.translationY < -swipeDistance && e.velocityY < -minVelocity;
            triggered = isFromEdge && isSwiping && isVerticalDominant;
          }

          if (triggered) {
            const now = Date.now();
            if (now - lastTriggerRef.current < debounceMs) return;
            lastTriggerRef.current = now;
            onSwipeRef.current();
          }
        }),
    [direction, edgeThreshold, swipeDistance, minVelocity, debounceMs, enabled],
  );

  return { gesture };
}

/**
 * useEdgeSwipe Hook
 * Detects swipe gestures from screen edges for actions like opening camera or navigation
 * Uses react-native-gesture-handler for reliable gesture detection
 *
 * Features:
 * - Detects swipes from any edge (left, right, top, bottom)
 * - Minimum swipe distance threshold for accurate detection
 * - Velocity-based validation for natural swipe gestures
 * - Configurable sensitivity
 * - Works reliably across all devices
 */

import { useRef, useCallback } from 'react';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

export type EdgeSwipeDirection = 'left' | 'right' | 'top' | 'bottom';

interface UseEdgeSwipeProps {
  /**
   * Which edge to detect swipes from
   * 'left': Swipe from left edge to right
   * 'right': Swipe from right edge to left
   * 'top': Swipe from top edge downward
   * 'bottom': Swipe from bottom edge upward
   */
  direction: EdgeSwipeDirection;

  /**
   * Callback when edge swipe is detected
   */
  onSwipe: () => void;

  /**
   * Minimum distance from edge to start detecting (pixels)
   * Default: 30
   */
  edgeThreshold?: number;

  /**
   * Minimum swipe distance required to trigger (pixels)
   * Default: 50
   */
  swipeDistance?: number;

  /**
   * Minimum velocity required for swipe (points/second)
   * Default: 0.2 (much lower than EdgePeekSlider's 0.35 for better UX)
   */
  minVelocity?: number;

  /**
   * Whether to enable haptic feedback on swipe
   * Default: true
   */
  haptic?: boolean;

  /**
   * Debounce time (ms) to prevent multiple triggers
   * Default: 500
   */
  debounceMs?: number;

  /**
   * Optional style for the gesture handler view
   */
  style?: ViewStyle;

  /**
   * Whether the gesture is enabled
   * Default: true
   */
  enabled?: boolean;
}

interface UseEdgeSwipeReturn {
  /**
   * Animated component wrapper - wrap your screen content with this
   */
  GestureView: React.ComponentType<{ children: React.ReactNode }>;
}

export function useEdgeSwipe({
  direction,
  onSwipe,
  edgeThreshold = 30,
  swipeDistance = 50,
  minVelocity = 0.2,
  haptic = true,
  debounceMs = 500,
  style,
  enabled = true,
}: UseEdgeSwipeProps): UseEdgeSwipeReturn {
  const lastTriggerRef = useRef<number>(0);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);

  const handleSwipe = useCallback(() => {
    const now = Date.now();
    if (now - lastTriggerRef.current < debounceMs) {
      return; // Still in debounce window
    }
    lastTriggerRef.current = now;

    if (haptic) {
      try {
        // Dynamic import to avoid issues on web
        require('expo-haptics').selectionAsync().catch(() => {});
      } catch (e) {
        // Haptics not available
      }
    }

    onSwipe();
  }, [onSwipe, debounceMs, haptic]);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; startY: number }
  >({
    onStart: (event, ctx) => {
      ctx.startX = event.absoluteX;
      ctx.startY = event.absoluteY;
    },
    onUpdate: (event) => {
      translationX.value = event.translationX;
      translationY.value = event.translationY;
    },
    onEnd: (event, ctx) => {
      const isVertical = Math.abs(event.velocityY) > Math.abs(event.velocityX);

      if (direction === 'left') {
        // Detect swipe from left edge to right
        const isFromLeftEdge = ctx.startX < edgeThreshold;
        const isMovingRight = event.translationX > swipeDistance && event.velocityX > minVelocity;

        if (isFromLeftEdge && isMovingRight) {
          runOnJS(handleSwipe)();
        }
      } else if (direction === 'right') {
        // Detect swipe from right edge to left
        const screenWidth = event.absoluteX + event.translationX; // Approximate
        const isFromRightEdge = ctx.startX > screenWidth * 0.9; // Right 10% of screen
        const isMovingLeft = event.translationX < -swipeDistance && event.velocityX < -minVelocity;

        if (isFromRightEdge && isMovingLeft) {
          runOnJS(handleSwipe)();
        }
      } else if (direction === 'top') {
        // Detect swipe from top edge downward
        const isFromTopEdge = ctx.startY < edgeThreshold;
        const isMovingDown = event.translationY > swipeDistance && event.velocityY > minVelocity;

        if (isFromTopEdge && isMovingDown && !isVertical) {
          runOnJS(handleSwipe)();
        }
      } else if (direction === 'bottom') {
        // Detect swipe from bottom edge upward
        const isFromBottomEdge = ctx.startY > 700; // Approximate bottom 20%
        const isMovingUp = event.translationY < -swipeDistance && event.velocityY < -minVelocity;

        if (isFromBottomEdge && isMovingUp && !isVertical) {
          runOnJS(handleSwipe)();
        }
      }
    },
  });

  const GestureView = useCallback(
    ({ children }: { children: React.ReactNode }) => (
      <PanGestureHandler
        enabled={enabled}
        onGestureEvent={gestureHandler}
        failOffsetX={direction === 'left' ? 50 : direction === 'right' ? -50 : undefined}
        failOffsetY={direction === 'top' ? 50 : direction === 'bottom' ? -50 : undefined}
      >
        <Animated.View style={style}>{children}</Animated.View>
      </PanGestureHandler>
    ),
    [gestureHandler, enabled, style, direction]
  );

  return { GestureView };
}

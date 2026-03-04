/**
 * useCalendarScroll Hook
 * Consolidates all scroll-related state and refs for the calendar
 *
 * Manages:
 * - Reanimated shared scroll value and position tracking
 * - Viewport and content dimensions
 * - Pending scroll operations
 * - Scroll suppression flags
 */

import { useRef, useState, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

export interface CalendarScrollState {
  // Animated values
  scrollY: SharedValue<number>;
  scrollYValue: number;

  // Dimensions
  viewportHeight: number;
  contentHeight: number;

  // Scroll control flags
  isExtending: boolean;
  suppressUpdate: boolean;
  programmaticInProgress: boolean;
  hasScrolledToInitial: boolean;

  // Pending operations
  pendingScrollKey: string | null;
  pendingPrependAdjust: { prevHeight: number; scrollY: number } | null;
}

export interface CalendarScrollActions {
  // Dimension updates
  setViewportHeight: (height: number) => void;
  setContentHeight: (height: number) => void;
  updateScrollY: (y: number) => void;

  // Extension control
  startExtend: () => void;
  completeExtend: () => void;

  // Scroll management
  setSuppressUpdate: (suppress: boolean) => void;
  startProgrammaticScroll: () => void;
  endProgrammaticScroll: () => void;

  // Pending operations
  setPendingScrollKey: (key: string | null) => void;
  setPendingPrependAdjust: (adjust: { prevHeight: number; scrollY: number } | null) => void;

  // Initialization
  markInitialScroll: () => void;

  // Scroll to position
  scrollToPosition: (y: number, animated?: boolean) => void;
}

export function useCalendarScroll(
  scrollRef: React.RefObject<ScrollView>
): [CalendarScrollState, CalendarScrollActions] {
  // Animated values
  const scrollY = useSharedValue(0);
  const scrollYRef = useRef(0);

  // Dimensions
  const viewportHeightRef = useRef(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const contentHeightRef = useRef(0);

  // Scroll control flags (don't trigger re-renders)
  const isExtendingRef = useRef(false);
  const suppressScrollUpdateRef = useRef(false);
  const programmaticScrollInProgressRef = useRef(false);
  const hasScrolledToInitialRef = useRef(false);

  // Pending operations
  const pendingScrollKeyRef = useRef<string | null>(null);
  const pendingPrependAdjustRef = useRef<{ prevHeight: number; scrollY: number } | null>(null);

  // State (triggers re-renders when needed)
  const [isExtending, setIsExtending] = useState(false);
  const [suppressUpdate, setSuppressUpdateState] = useState(false);
  const [programmaticInProgress, setProgrammaticInProgress] = useState(false);
  const [hasScrolledToInitial, setHasScrolledToInitial] = useState(false);
  const [pendingScrollKey, setPendingScrollKeyState] = useState<string | null>(null);
  const [pendingPrependAdjust, setPendingPrependAdjustState] = useState<{ prevHeight: number; scrollY: number } | null>(
    null
  );

  const state: CalendarScrollState = {
    scrollY,
    scrollYValue: scrollYRef.current,
    viewportHeight,
    contentHeight: contentHeightRef.current,
    isExtending,
    suppressUpdate,
    programmaticInProgress,
    hasScrolledToInitial,
    pendingScrollKey,
    pendingPrependAdjust,
  };

  const actions: CalendarScrollActions = {
    setViewportHeight: useCallback((height: number) => {
      viewportHeightRef.current = height;
      setViewportHeight(height);
    }, []),

    setContentHeight: useCallback((height: number) => {
      contentHeightRef.current = height;
    }, []),

    updateScrollY: useCallback((y: number) => {
      scrollYRef.current = y;
      scrollY.value = y;
    }, [scrollY]),

    startExtend: useCallback(() => {
      isExtendingRef.current = true;
      setIsExtending(true);
    }, []),

    completeExtend: useCallback(() => {
      isExtendingRef.current = false;
      setIsExtending(false);
    }, []),

    setSuppressUpdate: useCallback((suppress: boolean) => {
      suppressScrollUpdateRef.current = suppress;
      setSuppressUpdateState(suppress);
    }, []),

    startProgrammaticScroll: useCallback(() => {
      programmaticScrollInProgressRef.current = true;
      setProgrammaticInProgress(true);
    }, []),

    endProgrammaticScroll: useCallback(() => {
      programmaticScrollInProgressRef.current = false;
      setProgrammaticInProgress(false);
    }, []),

    setPendingScrollKey: useCallback((key: string | null) => {
      pendingScrollKeyRef.current = key;
      setPendingScrollKeyState(key);
    }, []),

    setPendingPrependAdjust: useCallback((adjust) => {
      pendingPrependAdjustRef.current = adjust;
      setPendingPrependAdjustState(adjust);
    }, []),

    markInitialScroll: useCallback(() => {
      hasScrolledToInitialRef.current = true;
      setHasScrolledToInitial(true);
    }, []),

    scrollToPosition: useCallback(
      (y: number, animated = false) => {
        scrollRef.current?.scrollTo({ y, animated });
        if (!animated) {
          scrollYRef.current = y;
          scrollY.value = y;
        }
      },
      [scrollRef, scrollY]
    ),
  };

  return [state, actions];
}

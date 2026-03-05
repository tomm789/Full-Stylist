import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';

type HideHeaderOptions = {
  hideDelta?: number;
  hideOffset?: number;
  showDelta?: number;
  showOffset?: number;
  translateAmount?: number;
  hideDuration?: number;
  showDuration?: number;
  onVisibilityChange?: (visible: boolean, timing: { hideDuration: number; showDuration: number }) => void;
};

type HideHeaderResult = {
  headerHeight: number | undefined;
  headerOpacity: SharedValue<number>;
  headerTranslate: SharedValue<number>;
  /** Pre-built animated style with opacity + translateY — use with Reanimated Animated.View */
  headerAnimatedStyle: { opacity: number; transform: { translateY: number }[] };
  headerReady: boolean;
  uiHidden: boolean;
  handleHeaderLayout: (event: LayoutChangeEvent) => void;
  handleScroll: (event: any) => void;
  setHeaderVisible: (visible: boolean) => void;
  resetScroll: () => void;
};

const DEFAULTS = {
  hideDelta: 2,
  hideOffset: 40,
  showDelta: -2,
  showOffset: 24,
  translateAmount: -8,
  hideDuration: 160,
  showDuration: 200,
};

export function useHideHeaderOnScroll(
  options: HideHeaderOptions = {}
): HideHeaderResult {
  const config = { ...DEFAULTS, ...options };
  const [uiHidden, setUiHidden] = useState(false);
  const [headerReady, setHeaderReady] = useState(false);
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined);
  const headerHeightRef = useRef(0);
  const headerOpacity = useSharedValue(1);
  const headerTranslate = useSharedValue(0);
  const lastScrollY = useRef(0);
  const uiHiddenRef = useRef(false);
  const animatingRef = useRef(false);

  // Store onVisibilityChange in a ref so setHeaderVisible has a stable identity
  const onVisibilityChangeRef = useRef(options.onVisibilityChange);
  onVisibilityChangeRef.current = options.onVisibilityChange;

  const setHeaderVisible = useCallback(
    (visible: boolean) => {
      if (visible && !uiHiddenRef.current) return;
      if (!visible && uiHiddenRef.current) return;
      uiHiddenRef.current = !visible;
      onVisibilityChangeRef.current?.(visible, {
        hideDuration: config.hideDuration,
        showDuration: config.showDuration,
      });

      animatingRef.current = true;
      const duration = visible ? config.showDuration : config.hideDuration;

      // Container height change — use state update (layout handled by React)
      setContainerHeight(visible ? headerHeightRef.current : 0);

      // Opacity + translate — Reanimated withTiming on UI thread
      headerOpacity.value = withTiming(visible ? 1 : 0, { duration });
      headerTranslate.value = withTiming(
        visible ? 0 : config.translateAmount,
        { duration },
        (finished) => {
          // This callback runs on the UI thread; schedule JS thread work via runOnJS
          // But since we only need to update refs and state, use a simpler approach:
          // We'll rely on the duration timeout below instead.
        }
      );

      // Schedule post-animation cleanup after the duration elapses
      // This replaces the old .start() callback
      setTimeout(() => {
        animatingRef.current = false;
        setUiHidden(uiHiddenRef.current);
        if (!uiHiddenRef.current) {
          setContainerHeight(headerHeightRef.current);
        }
      }, duration + 10);
    },
    [
      config.hideDuration,
      config.showDuration,
      config.translateAmount,
      headerOpacity,
      headerTranslate,
    ]
  );

  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event?.nativeEvent?.layout?.height ?? 0;
      if (height <= 0) return;
      // Always track the latest measured height — the inner View measures
      // at its natural size even when clipped by overflow: hidden.
      headerHeightRef.current = height;
      if (animatingRef.current) return;
      if (!uiHiddenRef.current) {
        setContainerHeight(height);
        headerOpacity.value = 1;
        headerTranslate.value = 0;
      }
      if (!headerReady) {
        setHeaderReady(true);
      }
    },
    [headerOpacity, headerReady, headerTranslate]
  );

  const handleScroll = useCallback(
    (event: any) => {
      const offsetY =
        event?.nativeEvent?.contentOffset?.y ??
        event?.nativeEvent?.target?.scrollTop ??
        event?.nativeEvent?.currentTarget?.scrollTop ??
        0;
      const lastOffset = lastScrollY.current;
      const delta = offsetY - lastOffset;
      lastScrollY.current = offsetY;

      if (offsetY < 0 || offsetY <= 8) {
        setHeaderVisible(true);
        return;
      }

      if (delta > config.hideDelta && offsetY > config.hideOffset) {
        setHeaderVisible(false);
        return;
      }

      if (delta < config.showDelta || offsetY < config.showOffset) {
        setHeaderVisible(true);
      }
    },
    [config.hideDelta, config.hideOffset, config.showDelta, config.showOffset, setHeaderVisible]
  );

  const resetScroll = useCallback(() => {
    lastScrollY.current = 0;
  }, []);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      cancelAnimation(headerOpacity);
      cancelAnimation(headerTranslate);
    };
  }, [headerOpacity, headerTranslate]);

  // Pre-built animated style for consumers
  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  return {
    headerHeight: containerHeight,
    headerOpacity,
    headerTranslate,
    headerAnimatedStyle,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll,
    setHeaderVisible,
    resetScroll,
  };
}

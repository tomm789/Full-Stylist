import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, LayoutChangeEvent, Platform, UIManager } from 'react-native';

// Enable LayoutAnimation on Android (no-op on new architecture / Fabric)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  headerOpacity: Animated.Value;
  headerTranslate: Animated.Value;
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
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslate = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const uiHiddenRef = useRef(false);
  const animatingRef = useRef(false);
  const animGenRef = useRef(0);

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
      const gen = ++animGenRef.current;
      const duration = visible ? config.showDuration : config.hideDuration;

      // Height — LayoutAnimation handles the layout transition natively.
      // configureNext applies to all layout changes in the next render cycle.
      LayoutAnimation.configureNext({
        duration,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
      setContainerHeight(visible ? headerHeightRef.current : 0);

      // Opacity + translate — native driver for smooth 60fps on UI thread
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: visible ? 1 : 0,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslate, {
          toValue: visible ? 0 : config.translateAmount,
          duration,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (gen !== animGenRef.current) return;
        animatingRef.current = false;
        setUiHidden(uiHiddenRef.current);
        if (finished && !uiHiddenRef.current) {
          setContainerHeight(headerHeightRef.current);
        }
      });
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
        headerOpacity.setValue(1);
        headerTranslate.setValue(0);
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

  // Cleanup all animation listeners on unmount
  useEffect(() => {
    return () => {
      headerOpacity.stopAnimation();
      headerOpacity.removeAllListeners();
      headerTranslate.stopAnimation();
      headerTranslate.removeAllListeners();
    };
  }, [headerOpacity, headerTranslate]);

  return {
    headerHeight: containerHeight,
    headerOpacity,
    headerTranslate,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll,
    setHeaderVisible,
    resetScroll,
  };
}

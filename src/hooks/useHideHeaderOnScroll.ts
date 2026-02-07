import { useCallback, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent } from 'react-native';

type HideHeaderOptions = {
  hideDelta?: number;
  hideOffset?: number;
  showDelta?: number;
  showOffset?: number;
  translateAmount?: number;
  hideDuration?: number;
  showDuration?: number;
};

type HideHeaderResult = {
  headerHeight: Animated.Value;
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
  const headerHeightRef = useRef(0);
  const headerHeight = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslate = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const uiHiddenRef = useRef(false);

  const setHeaderVisible = useCallback(
    (visible: boolean) => {
      if (visible && !uiHiddenRef.current) return;
      if (!visible && uiHiddenRef.current) return;
      uiHiddenRef.current = !visible;
      setUiHidden(!visible);

      const heightDuration = visible ? config.showDuration : config.hideDuration;
      const fadeDuration = visible ? config.showDuration : config.hideDuration;
      Animated.parallel([
        Animated.timing(headerHeight, {
          toValue: visible ? headerHeightRef.current : 0,
          duration: heightDuration,
          useNativeDriver: false,
        }),
        Animated.timing(headerOpacity, {
          toValue: visible ? 1 : 0,
          duration: fadeDuration,
          useNativeDriver: false,
        }),
        Animated.timing(headerTranslate, {
          toValue: visible ? 0 : config.translateAmount,
          duration: fadeDuration,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [config.hideDuration, config.showDuration, config.translateAmount, headerHeight, headerOpacity, headerTranslate]
  );

  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event?.nativeEvent?.layout?.height ?? 0;
      if (height <= 0) return;
      headerHeightRef.current = height;
      if (!uiHiddenRef.current) {
        headerHeight.setValue(height);
        headerOpacity.setValue(1);
        headerTranslate.setValue(0);
      }
      if (!headerReady) {
        setHeaderReady(true);
      }
    },
    [headerHeight, headerOpacity, headerReady, headerTranslate]
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

  return {
    headerHeight,
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

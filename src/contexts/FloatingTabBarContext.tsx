import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Animated } from 'react-native';

type TabBarTiming = {
  hideDuration?: number;
  showDuration?: number;
};

type FloatingTabBarContextValue = {
  tabBarOpacity: Animated.Value;
  setTabBarDimmed: (dimmed: boolean, timing?: TabBarTiming) => void;
  setTabBarOpacity: (opacity: number, timing?: TabBarTiming) => void;
};

const DEFAULT_TIMING = {
  hideDuration: 160,
  showDuration: 200,
};

const DIMMED_OPACITY = 0.65;

const FloatingTabBarContext = createContext<FloatingTabBarContextValue | null>(null);

export function FloatingTabBarProvider({ children }: { children: React.ReactNode }) {
  const tabBarOpacity = useRef(new Animated.Value(1)).current;
  const dimmedRef = useRef(false);

  const setTabBarDimmed = useCallback(
    (dimmed: boolean, timing?: TabBarTiming) => {
      if (dimmedRef.current === dimmed) return;
      dimmedRef.current = dimmed;
      const duration = dimmed
        ? timing?.hideDuration ?? DEFAULT_TIMING.hideDuration
        : timing?.showDuration ?? DEFAULT_TIMING.showDuration;
      Animated.timing(tabBarOpacity, {
        toValue: dimmed ? DIMMED_OPACITY : 1,
        duration,
        useNativeDriver: false,
      }).start();
    },
    [tabBarOpacity]
  );

  const setTabBarOpacity = useCallback(
    (opacity: number, timing?: TabBarTiming) => {
      const duration = opacity === 0
        ? timing?.hideDuration ?? DEFAULT_TIMING.hideDuration
        : timing?.showDuration ?? DEFAULT_TIMING.showDuration;
      Animated.timing(tabBarOpacity, {
        toValue: opacity,
        duration,
        useNativeDriver: false,
      }).start();
    },
    [tabBarOpacity]
  );

  const value = useMemo(
    () => ({
      tabBarOpacity,
      setTabBarDimmed,
      setTabBarOpacity,
    }),
    [setTabBarDimmed, setTabBarOpacity, tabBarOpacity]
  );

  return (
    <FloatingTabBarContext.Provider value={value}>
      {children}
    </FloatingTabBarContext.Provider>
  );
}

const NOOP_OPACITY = new Animated.Value(1);
const noopFallback: FloatingTabBarContextValue = {
  tabBarOpacity: NOOP_OPACITY,
  setTabBarDimmed: () => {},
  setTabBarOpacity: () => {},
};

export function useFloatingTabBar() {
  const context = useContext(FloatingTabBarContext);
  return context ?? noopFallback;
}

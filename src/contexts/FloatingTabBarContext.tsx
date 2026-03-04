import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

type TabBarTiming = {
  hideDuration?: number;
  showDuration?: number;
};

type FloatingTabBarContextValue = {
  tabBarOpacity: SharedValue<number>;
  tabBarDimOpacity: SharedValue<number>;
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
  const tabBarOpacity = useSharedValue(1);
  const tabBarDimOpacity = useSharedValue(1);
  const dimmedRef = useRef(false);

  const setTabBarDimmed = useCallback(
    (dimmed: boolean, timing?: TabBarTiming) => {
      if (dimmedRef.current === dimmed) return;
      dimmedRef.current = dimmed;
      const duration = dimmed
        ? timing?.hideDuration ?? DEFAULT_TIMING.hideDuration
        : timing?.showDuration ?? DEFAULT_TIMING.showDuration;
      tabBarDimOpacity.value = withTiming(dimmed ? DIMMED_OPACITY : 1, { duration });
    },
    [tabBarDimOpacity]
  );

  const setTabBarOpacity = useCallback(
    (opacity: number, timing?: TabBarTiming) => {
      const duration = opacity === 0
        ? timing?.hideDuration ?? DEFAULT_TIMING.hideDuration
        : timing?.showDuration ?? DEFAULT_TIMING.showDuration;
      tabBarOpacity.value = withTiming(opacity, { duration });
    },
    [tabBarOpacity]
  );

  const value = useMemo(
    () => ({
      tabBarOpacity,
      tabBarDimOpacity,
      setTabBarDimmed,
      setTabBarOpacity,
    }),
    [setTabBarDimmed, setTabBarOpacity, tabBarOpacity, tabBarDimOpacity]
  );

  return (
    <FloatingTabBarContext.Provider value={value}>
      {children}
    </FloatingTabBarContext.Provider>
  );
}

const noopSharedValue: SharedValue<number> = {
  value: 1,
  addListener: () => {},
  removeListener: () => {},
  modify: () => {},
} as unknown as SharedValue<number>;

const noopFallback: FloatingTabBarContextValue = {
  tabBarOpacity: noopSharedValue,
  tabBarDimOpacity: noopSharedValue,
  setTabBarDimmed: () => {},
  setTabBarOpacity: () => {},
};

export function useFloatingTabBar() {
  const context = useContext(FloatingTabBarContext);
  return context ?? noopFallback;
}

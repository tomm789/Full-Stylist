/**
 * usePeriodicRefresh Hook
 * Start/stop periodic interval-based refresh of wardrobe item images and attributes
 */

import { useRef, useCallback } from 'react';

interface PeriodicRefreshCallbacks {
  refreshImages: () => Promise<void>;
  refreshAttributes: () => Promise<void>;
  onImageRefreshTimeout?: () => void;
}

export function usePeriodicRefresh(
  itemId: string | undefined,
  userId: string | undefined,
  callbacks: PeriodicRefreshCallbacks
) {
  // Periodic refresh refs
  const periodicImageRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const periodicImageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const periodicAttributeRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const periodicAttributeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable refs for callbacks so intervals always call latest version
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Start periodic image refresh (fallback when no job)
  const startPeriodicImageRefresh = useCallback(() => {
    if (periodicImageRefreshRef.current) {
      clearInterval(periodicImageRefreshRef.current);
    }
    if (periodicImageTimeoutRef.current) {
      clearTimeout(periodicImageTimeoutRef.current);
    }

    periodicImageRefreshRef.current = setInterval(async () => {
      if (!itemId) return;
      await callbacksRef.current.refreshImages();
    }, 3000);

    periodicImageTimeoutRef.current = setTimeout(() => {
      if (periodicImageRefreshRef.current) {
        clearInterval(periodicImageRefreshRef.current);
        periodicImageRefreshRef.current = null;
      }
      callbacksRef.current.onImageRefreshTimeout?.();
    }, 90000);
  }, [itemId]);

  const stopPeriodicImageRefresh = useCallback(() => {
    if (periodicImageRefreshRef.current) {
      clearInterval(periodicImageRefreshRef.current);
      periodicImageRefreshRef.current = null;
    }
    if (periodicImageTimeoutRef.current) {
      clearTimeout(periodicImageTimeoutRef.current);
      periodicImageTimeoutRef.current = null;
    }
  }, []);

  // Start periodic attribute refresh (fallback when no job)
  const startPeriodicAttributeRefresh = useCallback(() => {
    if (periodicAttributeRefreshRef.current) {
      clearInterval(periodicAttributeRefreshRef.current);
    }
    if (periodicAttributeTimeoutRef.current) {
      clearTimeout(periodicAttributeTimeoutRef.current);
    }

    periodicAttributeRefreshRef.current = setInterval(async () => {
      await callbacksRef.current.refreshAttributes();
    }, 5000);

    periodicAttributeTimeoutRef.current = setTimeout(() => {
      if (periodicAttributeRefreshRef.current) {
        clearInterval(periodicAttributeRefreshRef.current);
        periodicAttributeRefreshRef.current = null;
      }
    }, 120000);
  }, []);

  const stopPeriodicAttributeRefresh = useCallback(() => {
    if (periodicAttributeRefreshRef.current) {
      clearInterval(periodicAttributeRefreshRef.current);
      periodicAttributeRefreshRef.current = null;
    }
    if (periodicAttributeTimeoutRef.current) {
      clearTimeout(periodicAttributeTimeoutRef.current);
      periodicAttributeTimeoutRef.current = null;
    }
  }, []);

  // Combined start/stop helpers
  const startPeriodicRefresh = useCallback(() => {
    startPeriodicImageRefresh();
    startPeriodicAttributeRefresh();
  }, [startPeriodicImageRefresh, startPeriodicAttributeRefresh]);

  const stopPeriodicRefresh = useCallback(() => {
    stopPeriodicImageRefresh();
    stopPeriodicAttributeRefresh();
  }, [stopPeriodicImageRefresh, stopPeriodicAttributeRefresh]);

  return {
    startPeriodicImageRefresh,
    stopPeriodicImageRefresh,
    startPeriodicAttributeRefresh,
    stopPeriodicAttributeRefresh,
    startPeriodicRefresh,
    stopPeriodicRefresh,
  };
}

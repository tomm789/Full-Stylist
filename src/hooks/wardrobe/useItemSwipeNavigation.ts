/**
 * useItemSwipeNavigation Hook
 * Encapsulates index math, boundary detection, and haptic feedback
 * for swiping between wardrobe items in the detail sheet.
 */

import { useCallback, useMemo } from 'react';
import { haptics } from '@/utils/haptics';

interface UseItemSwipeNavigationProps {
  itemIds: string[];
  currentItemId: string | undefined;
  onNavigate: (itemId: string) => void;
  enabled: boolean;
}

export function useItemSwipeNavigation({
  itemIds,
  currentItemId,
  onNavigate,
  enabled,
}: UseItemSwipeNavigationProps) {
  const currentIndex = useMemo(
    () => (currentItemId ? itemIds.indexOf(currentItemId) : -1),
    [itemIds, currentItemId],
  );

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= itemIds.length - 1;

  const navigateNext = useCallback(() => {
    if (!enabled || currentIndex < 0) return;
    if (isLast) {
      haptics.warning();
      return;
    }
    haptics.medium();
    onNavigate(itemIds[currentIndex + 1]);
  }, [enabled, currentIndex, isLast, itemIds, onNavigate]);

  const navigatePrev = useCallback(() => {
    if (!enabled || currentIndex < 0) return;
    if (isFirst) {
      haptics.warning();
      return;
    }
    haptics.medium();
    onNavigate(itemIds[currentIndex - 1]);
  }, [enabled, currentIndex, isFirst, itemIds, onNavigate]);

  return { navigateNext, navigatePrev, currentIndex, isFirst, isLast };
}

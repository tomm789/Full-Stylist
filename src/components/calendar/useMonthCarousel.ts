/**
 * useMonthCarousel Hook
 * Handles animated month transitions for the calendar grid.
 *
 * Migrated from legacy Animated API to react-native-reanimated v4.
 */

import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import {
  useSharedValue,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

interface UseMonthCarouselOptions {
  currentDate: Date;
  onNavigate: (direction: number) => void;
}

interface UseMonthCarouselReturn {
  gridDates: Date[];
  slideX: SharedValue<number>;
  slideDirection: number | null;
  containerWidth: number;
  isAnimating: boolean;
  handleMonthNavigate: (direction: number) => void;
  handleCalendarLayout: (event: LayoutChangeEvent) => void;
}

export function useMonthCarousel({
  currentDate,
  onNavigate,
}: UseMonthCarouselOptions): UseMonthCarouselReturn {
  const [slideDirection, setSlideDirection] = useState<number | null>(null);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const slideX = useSharedValue(0);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const onAnimationComplete = useCallback(
    (direction: number) => {
      onNavigate(direction);
      setSlideDirection(null);
      setNextDate(null);
      setIsAnimating(false);
      slideX.value = 0;
    },
    [onNavigate, slideX],
  );

  const animateMonthChange = useCallback(
    (direction: number) => {
      if (isAnimating) {
        return;
      }

      const newDate = new Date(year, month + direction, 1);
      if (!containerWidth) {
        onNavigate(direction);
        return;
      }

      setIsAnimating(true);
      setSlideDirection(direction);
      setNextDate(newDate);

      const startX = direction === 1 ? 0 : -containerWidth;
      const endX = direction === 1 ? -containerWidth : 0;

      slideX.value = startX;

      slideX.value = withTiming(
        endX,
        {
          duration: 260,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(onAnimationComplete)(direction);
          }
        },
      );
    },
    [isAnimating, year, month, containerWidth, onNavigate, slideX, onAnimationComplete],
  );

  const handleMonthNavigate = useCallback(
    (direction: number) => {
      animateMonthChange(direction);
    },
    [animateMonthChange],
  );

  const handleCalendarLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      if (width && width !== containerWidth) {
        setContainerWidth(width);
      }
    },
    [containerWidth],
  );

  const gridDates = useMemo(() => {
    if (!slideDirection || !nextDate) {
      return [currentDate];
    }

    if (slideDirection === 1) {
      return [currentDate, nextDate];
    }

    return [nextDate, currentDate];
  }, [currentDate, nextDate, slideDirection]);

  return {
    gridDates,
    slideX,
    slideDirection,
    containerWidth,
    isAnimating,
    handleMonthNavigate,
    handleCalendarLayout,
  };
}

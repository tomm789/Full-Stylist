/**
 * useMonthCarousel Hook
 * Handles animated month transitions for the calendar grid.
 */

import { useMemo, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent } from 'react-native';

interface UseMonthCarouselOptions {
  currentDate: Date;
  onNavigate: (direction: number) => void;
}

interface UseMonthCarouselReturn {
  gridDates: Date[];
  slideX: Animated.Value;
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

  const slideX = useRef(new Animated.Value(0)).current;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const animateMonthChange = (direction: number) => {
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

    slideX.setValue(startX);

    Animated.timing(slideX, {
      toValue: endX,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onNavigate(direction);
      setSlideDirection(null);
      setNextDate(null);
      setIsAnimating(false);
      slideX.setValue(0);
    });
  };

  const handleMonthNavigate = (direction: number) => {
    animateMonthChange(direction);
  };

  const handleCalendarLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

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
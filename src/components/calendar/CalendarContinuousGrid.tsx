/**
 * CalendarContinuousGrid Component
 * Continuous calendar grid without month padding gaps
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import CalendarDayCell from './CalendarDayCell';
import { CalendarEntry } from '@/lib/calendar';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { CALENDAR_CONFIG } from '@/lib/calendar/config';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing } = theme;

interface CalendarContinuousGridProps {
  startDate: Date;
  endDate: Date;
  entries: Map<string, CalendarEntry[]>;
  outfitImages: Map<string, string | null>;
  onDayPress: (date: Date) => void;
  scrollY: SharedValue<number>;
  viewportHeight: number;
  activeMonthDate?: Date;
}

// ── Month pill sub-component (each pill needs its own useAnimatedStyle) ─────
interface MonthPillProps {
  pill: { key: string; label: string; top: number; month: number; year: number };
  scrollY: SharedValue<number>;
  directionOffset: SharedValue<number>;
  bounceValue: SharedValue<number>;
  viewportHeight: number;
  style: any;
  textStyle: any;
}

function MonthPill({
  pill,
  scrollY,
  directionOffset,
  bounceValue,
  viewportHeight,
  style,
  textStyle,
}: MonthPillProps) {
  const effectiveViewport = viewportHeight || 600;
  const midPoint = pill.top - effectiveViewport * 0.5;
  const exitPoint = pill.top - effectiveViewport * 0.25;

  const animatedStyle = useAnimatedStyle(() => {
    // Compute slideOut (same as the old .interpolate)
    const adjustedScroll = scrollY.value + directionOffset.value;
    const range = exitPoint - midPoint;
    let slideOut = 0;
    if (range !== 0) {
      const ratio = (adjustedScroll - midPoint) / range;
      const clamped = Math.min(1, Math.max(0, ratio));
      slideOut = clamped * CALENDAR_CONFIG.PILL_SLIDE_DISTANCE;
    }

    const translateX = slideOut + bounceValue.value;
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
      style={[style, { top: pill.top }, animatedStyle]}
    >
      <Text style={textStyle}>{pill.label}</Text>
    </Animated.View>
  );
}

export default function CalendarContinuousGrid({
  startDate,
  endDate,
  entries,
  outfitImages,
  onDayPress,
  scrollY,
  viewportHeight,
  activeMonthDate,
}: CalendarContinuousGridProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const days = useMemo(() => {
    const list: Date[] = [];
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      list.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [startDate, endDate]);

  const getDayEntries = (date: Date): CalendarEntry[] => {
    const dateKey = date.toISOString().split('T')[0];
    return entries.get(dateKey) || [];
  };

  const pillConfigs = useMemo(() => {
    return days
      .map((date, index) => {
        if (date.getDate() !== 1) return null;
        const rowIndex = Math.floor(index / 7);
        const top = rowIndex * ROW_HEIGHT - PILL_HEIGHT;
        return {
          key: `pill-${date.toISOString()}`,
          label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
          top,
          month: date.getMonth(),
          year: date.getFullYear(),
        };
      })
      .filter(Boolean) as Array<{ key: string; label: string; top: number; month: number; year: number }>;
  }, [days]);

  // Shared values for bounce per pill and scroll direction offset
  const prevRatioRef = useRef<Map<string, number>>(new Map());
  const directionOffset = useSharedValue(0);

  // Since we can't dynamically create shared values with hooks,
  // we'll pre-allocate a pool of shared values for the maximum expected pills.
  // Typically a calendar shows ~12-24 months max.
  const MAX_PILLS = 36;
  // Create a fixed array of shared values at the top level
  const bouncePool = useRef<SharedValue<number>[]>([]);

  // Initialize bounce pool - this is a workaround for dynamic shared values
  // We use useSharedValue for the first one and create additional ones via the same mechanism
  const bounce0 = useSharedValue(0);
  const bounce1 = useSharedValue(0);
  const bounce2 = useSharedValue(0);
  const bounce3 = useSharedValue(0);
  const bounce4 = useSharedValue(0);
  const bounce5 = useSharedValue(0);
  const bounce6 = useSharedValue(0);
  const bounce7 = useSharedValue(0);
  const bounce8 = useSharedValue(0);
  const bounce9 = useSharedValue(0);
  const bounce10 = useSharedValue(0);
  const bounce11 = useSharedValue(0);
  const bounce12 = useSharedValue(0);
  const bounce13 = useSharedValue(0);
  const bounce14 = useSharedValue(0);
  const bounce15 = useSharedValue(0);
  const bounce16 = useSharedValue(0);
  const bounce17 = useSharedValue(0);
  const bounce18 = useSharedValue(0);
  const bounce19 = useSharedValue(0);
  const bounce20 = useSharedValue(0);
  const bounce21 = useSharedValue(0);
  const bounce22 = useSharedValue(0);
  const bounce23 = useSharedValue(0);
  const bounce24 = useSharedValue(0);
  const bounce25 = useSharedValue(0);
  const bounce26 = useSharedValue(0);
  const bounce27 = useSharedValue(0);
  const bounce28 = useSharedValue(0);
  const bounce29 = useSharedValue(0);
  const bounce30 = useSharedValue(0);
  const bounce31 = useSharedValue(0);
  const bounce32 = useSharedValue(0);
  const bounce33 = useSharedValue(0);
  const bounce34 = useSharedValue(0);
  const bounce35 = useSharedValue(0);

  // Store the pool in a ref for stable access
  if (bouncePool.current.length === 0) {
    bouncePool.current = [
      bounce0, bounce1, bounce2, bounce3, bounce4, bounce5,
      bounce6, bounce7, bounce8, bounce9, bounce10, bounce11,
      bounce12, bounce13, bounce14, bounce15, bounce16, bounce17,
      bounce18, bounce19, bounce20, bounce21, bounce22, bounce23,
      bounce24, bounce25, bounce26, bounce27, bounce28, bounce29,
      bounce30, bounce31, bounce32, bounce33, bounce34, bounce35,
    ];
  }

  // React to scrollY changes to update direction offset and trigger bounce animations
  useAnimatedReaction(
    () => scrollY.value,
    (value, previousValue) => {
      if (previousValue === null || previousValue === undefined) return;
      const effectiveViewport = viewportHeight || 600;
      const scrollingUp = value < previousValue;
      directionOffset.value = scrollingUp
        ? effectiveViewport * CALENDAR_CONFIG.DIRECTION_OFFSET_RATIO
        : 0;

      const triggerRatio = CALENDAR_CONFIG.PILL_TRIGGER_RATIO;

      // Check each pill for bounce trigger
      for (let i = 0; i < pillConfigs.length && i < MAX_PILLS; i++) {
        const pill = pillConfigs[i];
        const position = pill.top - value;
        const ratio = position / effectiveViewport;
        const prevRatio = prevRatioRef.current.get(pill.key) ?? 1;

        const crossedDown = prevRatio > triggerRatio && ratio <= triggerRatio;
        const crossedUp = prevRatio < triggerRatio && ratio >= triggerRatio;

        if (crossedDown || crossedUp) {
          const bounceValue = bouncePool.current[i];
          if (bounceValue) {
            bounceValue.value = withSequence(
              withTiming(-CALENDAR_CONFIG.BOUNCE_DISTANCE, {
                duration: CALENDAR_CONFIG.BOUNCE_ANIMATION_DURATION,
              }),
              withTiming(0, {
                duration: CALENDAR_CONFIG.BOUNCE_ANIMATION_DURATION,
              })
            );
          }
        }

        prevRatioRef.current.set(pill.key, ratio);
      }
    },
    [pillConfigs, viewportHeight]
  );

  // Reset bounce values when pill configs change
  useEffect(() => {
    // Initialize prevRatio for new pills
    const currentKeys = new Set(pillConfigs.map((p) => p.key));
    pillConfigs.forEach((pill) => {
      if (!prevRatioRef.current.has(pill.key)) {
        prevRatioRef.current.set(pill.key, 1);
      }
    });
    // Clean up removed keys
    prevRatioRef.current.forEach((_value, key) => {
      if (!currentKeys.has(key)) {
        prevRatioRef.current.delete(key);
      }
    });
  }, [pillConfigs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      prevRatioRef.current.clear();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.calendarGrid}>
        {days.map((date, index) => {
          const columnIndex = index % 7;
          return (
            <View
              key={`${date.toISOString()}-${index}`}
              style={[
                styles.cellSlot,
                columnIndex === 6 && styles.cellSlotLast,
              ]}
            >
              <CalendarDayCell
                date={date}
                entries={getDayEntries(date)}
                outfitImages={outfitImages}
                inCurrentMonth
                isToday={isToday(date)}
                onPress={() => onDayPress(date)}
              />
            </View>
          );
        })}
      </View>

      {pillConfigs.map((pill, index) => {
        // Hide the pill if it matches the currently active month in the navigator
        if (activeMonthDate &&
          pill.month === activeMonthDate.getMonth() &&
          pill.year === activeMonthDate.getFullYear()
        ) {
          return null;
        }

        // Use the bounce value from the pool (capped at MAX_PILLS)
        if (index >= MAX_PILLS) return null;
        const bounceValue = bouncePool.current[index];

        return (
          <MonthPill
            key={pill.key}
            pill={pill}
            scrollY={scrollY}
            directionOffset={directionOffset}
            bounceValue={bounceValue}
            viewportHeight={viewportHeight}
            style={styles.monthPill}
            textStyle={styles.monthPillText}
          />
        );
      })}
    </View>
  );
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Use CALENDAR_CONFIG for dimensions
const ROW_HEIGHT = CALENDAR_CONFIG.ROW_HEIGHT;
const PILL_HEIGHT = CALENDAR_CONFIG.PILL_HEIGHT;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'relative',
    paddingBottom: spacing.md,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: StyleSheet.hairlineWidth,
  },
  cellSlot: {
    width: `${100 / 7}%`,
    height: ROW_HEIGHT,
    paddingRight: StyleSheet.hairlineWidth,
    paddingBottom: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  cellSlotLast: {
    paddingRight: 0,
  },
  monthPill: {
    position: 'absolute',
    right: 0,
    height: PILL_HEIGHT,
    paddingHorizontal: spacing.sm,
    borderTopLeftRadius: PILL_HEIGHT / 2,
    borderBottomLeftRadius: PILL_HEIGHT / 2,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  monthPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
});

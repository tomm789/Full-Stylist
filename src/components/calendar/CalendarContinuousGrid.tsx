/**
 * CalendarContinuousGrid Component
 * Continuous calendar grid without month padding gaps
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import CalendarDayCell from './CalendarDayCell';
import { CalendarEntry } from '@/lib/calendar';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

interface CalendarContinuousGridProps {
  startDate: Date;
  endDate: Date;
  entries: Map<string, CalendarEntry[]>;
  outfitImages: Map<string, string | null>;
  onDayPress: (date: Date) => void;
  scrollY: Animated.Value;
  viewportHeight: number;
}

export default function CalendarContinuousGrid({
  startDate,
  endDate,
  entries,
  outfitImages,
  onDayPress,
  scrollY,
  viewportHeight,
}: CalendarContinuousGridProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
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
        };
      })
      .filter(Boolean) as Array<{ key: string; label: string; top: number }>;
  }, [days]);

  const bounceValuesRef = useRef<Map<string, Animated.Value>>(new Map());
  const prevRatioRef = useRef<Map<string, number>>(new Map());
  const prevScrollRef = useRef(0);
  const directionOffsetRef = useRef(new Animated.Value(0));

  useEffect(() => {
    pillConfigs.forEach((pill) => {
      if (!bounceValuesRef.current.has(pill.key)) {
        bounceValuesRef.current.set(pill.key, new Animated.Value(0));
      }
      if (!prevRatioRef.current.has(pill.key)) {
        prevRatioRef.current.set(pill.key, 1);
      }
    });
  }, [pillConfigs]);

  useEffect(() => {
    if (!scrollY) return;

    const id = scrollY.addListener(({ value }) => {
      const effectiveViewport = viewportHeight || 600;
      const scrollingUp = value < prevScrollRef.current;
      const offset = scrollingUp ? effectiveViewport * 0.15 : 0;
      directionOffsetRef.current.setValue(offset);
      prevScrollRef.current = value;

      const triggerRatio = 0.3;

      pillConfigs.forEach((pill) => {
        const position = pill.top - value;
        const ratio = position / effectiveViewport;
        const prevRatio = prevRatioRef.current.get(pill.key) ?? 1;

        const crossedDown = prevRatio > triggerRatio && ratio <= triggerRatio;
        const crossedUp = prevRatio < triggerRatio && ratio >= triggerRatio;

        if (crossedDown || crossedUp) {
          const bounceValue = bounceValuesRef.current.get(pill.key);
          if (bounceValue) {
            bounceValue.stopAnimation();
            bounceValue.setValue(0);
            Animated.sequence([
              Animated.timing(bounceValue, {
                toValue: -10,
                duration: 150,
                useNativeDriver: true,
              }),
              Animated.timing(bounceValue, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }

        prevRatioRef.current.set(pill.key, ratio);
      });
    });

    return () => {
      scrollY.removeListener(id);
    };
  }, [scrollY, viewportHeight, pillConfigs]);

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

      {pillConfigs.map((pill) => {
        const effectiveViewport = viewportHeight || 600;
        const offRight = 120;
        const midPoint = pill.top - effectiveViewport * 0.5;
        const exitPoint = pill.top - effectiveViewport * 0.25;
        const adjustedScrollY = Animated.add(scrollY, directionOffsetRef.current);
        const slideOut = adjustedScrollY.interpolate({
          inputRange: [midPoint, exitPoint],
          outputRange: [0, offRight],
          extrapolate: 'clamp',
        });
        const bounceValue = bounceValuesRef.current.get(pill.key) ?? new Animated.Value(0);
        const translateX = Animated.add(slideOut, bounceValue);

        return (
          <Animated.View
            key={pill.key}
            style={[styles.monthPill, { top: pill.top, transform: [{ translateX }] }]}
          >
            <Text style={styles.monthPillText}>{pill.label}</Text>
          </Animated.View>
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

const ROW_HEIGHT = 120;
const PILL_HEIGHT = 24;

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

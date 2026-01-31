/**
 * CalendarGrid Component
 * Monthly calendar grid with day cells
 */

import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';
import CalendarDayCell from './CalendarDayCell';
import { CalendarEntry } from '@/lib/calendar';
import { theme } from '@/styles';

const { colors, spacing, typography } = theme;

interface CalendarGridProps {
  currentDate: Date;
  entries: Map<string, CalendarEntry[]>;
  outfitImages: Map<string, string | null>;
  onDayPress: (date: Date) => void;
  onMonthSwipe?: (direction: number) => void;
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({
  currentDate,
  entries,
  outfitImages,
  onDayPress,
  onMonthSwipe,
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const swipeLocked = useRef(false);

  const panResponder = useMemo(() => {
    if (!onMonthSwipe) {
      return null;
    }

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        swipeLocked.current = false;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (swipeLocked.current) {
          return;
        }

        const { dx, dy } = gestureState;
        if (Math.abs(dx) < 40 || Math.abs(dy) > 60) {
          return;
        }

        const direction = dx < 0 ? 1 : -1;
        swipeLocked.current = true;
        onMonthSwipe(direction);
      },
    });
  }, [onMonthSwipe]);

  const getDaysInMonth = (): Date[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add padding days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Add days in current month
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Add padding days from next month to fill week
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push(date);
    }

    return days;
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month && date.getFullYear() === year;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDayEntries = (date: Date): CalendarEntry[] => {
    const dateKey = date.toISOString().split('T')[0];
    return entries.get(dateKey) || [];
  };

  const days = getDaysInMonth();

  return (
    <View style={styles.container} {...(panResponder?.panHandlers ?? {})}>
      {/* Week Days Header */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDay}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((date, index) => (
          <CalendarDayCell
            key={index}
            date={date}
            entries={getDayEntries(date)}
            outfitImages={outfitImages}
            inCurrentMonth={isCurrentMonth(date)}
            isToday={isToday(date)}
            onPress={() => onDayPress(date)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

/**
 * ScheduleCalendar Component
 * Calendar view for scheduling outfits
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface ScheduleCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  scheduledDates?: Date[];
}

export default function ScheduleCalendar({
  selectedDate,
  onSelectDate,
  scheduledDates = [],
}: ScheduleCalendarProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Generate calendar days for current month
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];

  // Add empty slots for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(currentYear, currentMonth, day));
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const isDateScheduled = (date: Date) => {
    return scheduledDates.some(
      (scheduledDate) =>
        scheduledDate.toDateString() === date.toDateString()
    );
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.monthTitle}>
        {firstDay.toLocaleString('default', { month: 'long', year: 'numeric' })}
      </Text>

      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((date, index) => {
          if (!date) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const scheduled = isDateScheduled(date);
          const today = isToday(date);
          const selected = isSelected(date);
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[
                styles.dayCell,
                today && styles.todayCell,
                selected && styles.selectedCell,
                isPast && styles.pastCell,
              ]}
              onPress={() => !isPast && onSelectDate(date)}
              disabled={isPast}
            >
              <Text
                style={[
                  styles.dayText,
                  today && styles.todayText,
                  selected && styles.selectedText,
                  isPast && styles.pastText,
                ]}
              >
                {date.getDate()}
              </Text>
              {scheduled && <View style={styles.scheduledDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  monthTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  weekDayText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    position: 'relative',
  },
  todayCell: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  selectedCell: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  pastCell: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  todayText: {
    fontWeight: '600',
    color: colors.primary,
  },
  selectedText: {
    fontWeight: '600',
    color: colors.white,
  },
  pastText: {
    color: colors.textSecondary,
  },
  scheduledDot: {
    position: 'absolute',
    bottom: spacing.xs / 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.success,
  },
});

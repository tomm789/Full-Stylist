/**
 * CalendarWeekHeader Component
 * Sticky weekday labels for calendar grid
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarWeekHeader() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      {weekDays.map((day) => (
        <View key={day} style={styles.weekDay}>
          <Text style={styles.weekDayText}>{day}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
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
});

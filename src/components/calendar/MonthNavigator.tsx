/**
 * MonthNavigator Component
 * Month navigation header with prev/next buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/styles';

const { colors, spacing, typography } = theme;

interface MonthNavigatorProps {
  currentDate: Date;
  onNavigate: (direction: number) => void;
  onToday: () => void;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function MonthNavigator({ currentDate, onNavigate, onToday }: MonthNavigatorProps) {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  return (
    <View style={styles.container}>
      <View style={styles.monthControls}>
        <View style={styles.monthPill}>
          <TouchableOpacity onPress={() => onNavigate(-1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity onPress={() => onNavigate(1)} style={styles.navButton}>
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={onToday} style={styles.todayButton}>
        <Text style={styles.todayButtonText}>Today</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    paddingTop: spacing.sm,
  },
  monthControls: {
    width: 240,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 22,
    color: colors.textPrimary,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
    textAlignVertical: 'center',
  },
  monthPill: {
    height: 36,
    width: 240,
    paddingHorizontal: spacing.sm,
    borderRadius: 18,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.white,
  },
  todayButton: {
    minWidth: 72,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.white,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

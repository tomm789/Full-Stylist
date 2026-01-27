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

export default function MonthNavigator({ currentDate, onNavigate }: MonthNavigatorProps) {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  return (
    <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + spacing.xs / 2,
    paddingHorizontal: spacing.md,
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
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

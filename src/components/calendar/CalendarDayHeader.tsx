/**
 * CalendarDayHeader Component
 * Header with navigation for calendar day screen
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/styles';

const { colors, spacing } = theme;

interface CalendarDayHeaderProps {
  date: string | undefined;
  onBack: () => void;
  onNavigateDay: (direction: 'prev' | 'next') => void;
}

export function CalendarDayHeader({
  date,
  onBack,
  onNavigateDay,
}: CalendarDayHeaderProps) {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.navigationRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.dayNavigationButtons}>
          <TouchableOpacity
            style={styles.dayNavButton}
            onPress={() => onNavigateDay('prev')}
          >
            <Text style={styles.dayNavButtonText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dayNavButton}
            onPress={() => onNavigateDay('next')}
          >
            <Text style={styles.dayNavButtonText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
      {date && <Text style={styles.dateText}>{formatDate(date)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  dayNavigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNavButtonText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

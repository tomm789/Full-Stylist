/**
 * HeaderTitleRow Component
 * Calendar icon + page title + optional right-side accessory.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

type HeaderTitleRowProps = {
  title: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  hideCalendar?: boolean;
  rightSlotExpand?: boolean;
  collapseTitle?: boolean;
};

export default function HeaderTitleRow({
  title,
  leftSlot,
  rightSlot,
  hideCalendar = false,
  rightSlotExpand = false,
  collapseTitle = false,
}: HeaderTitleRowProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.calendarButton, hideCalendar && styles.calendarButtonHidden]}
        onPress={() => router.push('/calendar' as any)}
        disabled={hideCalendar}
        accessibilityRole="button"
        accessibilityLabel="Open calendar"
      >
        <Ionicons
          name="calendar-outline"
          size={22}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
      {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
      <Text
        style={[
          styles.titleText,
          hideCalendar && styles.titleTextCompressed,
          collapseTitle && styles.titleTextCollapsed,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {rightSlot ? (
        <View style={[styles.rightSlot, rightSlotExpand && styles.rightSlotExpand]}>
          {rightSlot}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'space-between',
  },
  calendarButton: {
    padding: spacing.xs,
  },
  calendarButtonHidden: {
    opacity: 0,
    width: 0,
    paddingHorizontal: 0,
    marginRight: 0,
  },
  leftSlot: {
    marginRight: spacing.xs,
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  titleTextCompressed: {
    flexShrink: 1,
  },
  titleTextCollapsed: {
    width: 0,
    opacity: 0,
    marginRight: 0,
  },
  rightSlot: {
    alignItems: 'flex-end',
    minWidth: 0,
    marginLeft: 'auto',
  },
  rightSlotExpand: {
    flex: 1,
    alignItems: 'stretch',
  },
});

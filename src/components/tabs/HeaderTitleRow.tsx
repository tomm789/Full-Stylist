/**
 * HeaderTitleRow Component
 * Configurable left icon + page title + optional right-side accessory.
 *
 * The left button defaults to a calendar icon that navigates to /calendar,
 * but callers can override it with any Ionicon via leftIcon / onLeftAction.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, typography } = theme;

type HeaderTitleRowProps = {
  title: string;
  /** Override the default calendar icon shown on the left. */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Handler for the left icon button. Defaults to navigating to /calendar. */
  onLeftAction?: () => void;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  hideLeftIcon?: boolean;
  rightSlotExpand?: boolean;
  collapseTitle?: boolean;
  /** When provided, renders in the center and hides the title. */
  centerSlot?: React.ReactNode;
  /** @deprecated Use hideLeftIcon instead. */
  hideCalendar?: boolean;
};

export default function HeaderTitleRow({
  title,
  leftIcon = 'calendar-outline',
  onLeftAction,
  leftSlot,
  rightSlot,
  hideLeftIcon,
  rightSlotExpand = false,
  collapseTitle = false,
  centerSlot,
  hideCalendar,
}: HeaderTitleRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const isHidden = hideLeftIcon ?? hideCalendar ?? false;
  const hideTitle = collapseTitle || !!centerSlot;

  const handleLeftPress = () => {
    if (onLeftAction) {
      onLeftAction();
    } else {
      router.push('/calendar' as any);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.leftIconButton, isHidden && styles.leftIconButtonHidden]}
        onPress={handleLeftPress}
        disabled={isHidden}
        accessibilityRole="button"
        accessibilityLabel={onLeftAction ? leftIcon.replace(/-outline$/, '').replace(/-/g, ' ') : 'Open calendar'}
      >
        <Ionicons
          name={leftIcon}
          size={22}
          color={colors.textPrimary}
        />
      </TouchableOpacity>
      {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
      {centerSlot ? (
        <View style={styles.centerSlot}>{centerSlot}</View>
      ) : (
        <Text
          style={[
            styles.titleText,
            isHidden && styles.titleTextCompressed,
            hideTitle && styles.titleTextCollapsed,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
      )}
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
  leftIconButton: {
    padding: spacing.xs,
  },
  leftIconButtonHidden: {
    opacity: 0,
    width: 0,
    paddingHorizontal: 0,
    marginRight: 0,
  },
  leftSlot: {
    marginRight: spacing.xs,
  },
  centerSlot: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
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

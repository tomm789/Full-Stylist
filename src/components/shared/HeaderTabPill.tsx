/**
 * HeaderTabPill Component
 * Compact header-embedded tab selector: outer pill with icon-only inactive tabs
 * and one active tab shown as inner pill with icon + label.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import type { TabPillItem } from './TabPillsRow';

const { spacing, borderRadius, typography } = theme;

type HeaderTabPillProps = {
  pills: TabPillItem[];
  activeId: string;
  onPress: (id: string) => void;
};

const ICON_SIZE = 18;

export default function HeaderTabPill({
  pills,
  activeId,
  onPress,
}: HeaderTabPillProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.outer}>
      {pills.map((item, index) => {
        const selected = activeId === item.id;
        const isFirst = index === 0;
        const isLast = index === pills.length - 1;
        const iconColor = selected ? colors.textLight : colors.textSecondary;
        const leading = item.iconComponent
          ? item.iconComponent({ size: ICON_SIZE, color: iconColor, selected })
          : null;

        const edgeMargin =
          !selected && (isFirst || isLast)
            ? {
                ...(isFirst && { marginLeft: spacing.xs }),
                ...(isLast && { marginRight: spacing.xs }),
              }
            : undefined;

        if (selected) {
          return (
            <View key={item.id} style={styles.activePill}>
              {leading ?? (
                <Ionicons name={item.icon} size={ICON_SIZE} color={iconColor} />
              )}
              <Text style={styles.activeLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.inactiveButton, edgeMargin]}
            onPress={() => onPress(item.id)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: false }}
          >
            {leading ?? (
              <Ionicons name={item.icon} size={ICON_SIZE} color={iconColor} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    outer: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.round,
      paddingHorizontal: 0,
      paddingVertical: 0,
      gap: spacing.xs,
    },
    activePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderRadius: borderRadius.round,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 26,
      gap: spacing.xs,
    },
    activeLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textLight,
      maxWidth: 100,
    },
    inactiveButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
  });

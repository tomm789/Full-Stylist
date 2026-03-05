/**
 * HeaderActionIcons
 * Shared right-side header icon group (add, search, notifications).
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';
import HeaderAvatarButton from './HeaderAvatarButton';

const { spacing, borderRadius, typography } = theme;

type HeaderActionIconsProps = {
  onAdd?: () => void;
  onSearch: () => void;
  onNotifications: () => void;
  onProfile?: () => void;
  avatarUri?: string | null;
  avatarInitials?: string;
  unreadCount?: number;
};

export default function HeaderActionIcons({
  onAdd,
  onSearch,
  onNotifications,
  onProfile,
  avatarUri,
  avatarInitials,
  unreadCount = 0,
}: HeaderActionIconsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {onAdd && (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel="Add item"
        >
          <Ionicons name="add-circle-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onSearch}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onNotifications}
        accessibilityRole="button"
        accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {onProfile && (
        <HeaderAvatarButton
          uri={avatarUri ?? undefined}
          initials={avatarInitials}
          onPress={onProfile}
          inline
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
});

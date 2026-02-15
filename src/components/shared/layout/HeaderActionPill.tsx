/**
 * HeaderActionPill
 * Compact action pill for header right side.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import HeaderAvatarButton from './HeaderAvatarButton';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

type HeaderActionPillProps = {
  onCamera: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  avatarUri?: string | null;
  avatarInitials?: string;
  unreadCount?: number;
  disabled?: boolean;
};

export default function HeaderActionPill({
  onCamera,
  onNotifications,
  onProfile,
  avatarUri,
  avatarInitials,
  unreadCount = 0,
  disabled = false,
}: HeaderActionPillProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.iconButton, disabled && styles.iconButtonDisabled]}
        onPress={onCamera}
        accessibilityLabel="Open camera"
        disabled={disabled}
      >
        <Ionicons name="camera-outline" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onNotifications}
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <HeaderAvatarButton
        uri={avatarUri ?? undefined}
        initials={avatarInitials}
        onPress={onProfile}
        inline
        borderless
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.xs,
    paddingRight: 0,
    height: 34,
    gap: spacing.xs,
  },
  iconButton: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDisabled: {
    opacity: 0.6,
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

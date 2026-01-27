/**
 * EmptyState Component
 * Reusable empty state with icon, message, and optional action
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from '../buttons/PrimaryButton';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, typography } = theme;

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({
  icon = 'folder-open-outline',
  iconSize = 64,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[commonStyles.emptyContainer, style]}>
      <Ionicons name={icon} size={iconSize} color={colors.gray400} />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={commonStyles.emptyText}>{message}</Text>}
      {actionLabel && onAction && (
        <PrimaryButton
          title={actionLabel}
          onPress={onAction}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
  },
});

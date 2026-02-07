/**
 * HeaderActionButton Component
 * Shared text-based action for headers (e.g., Cancel, Save, Create).
 */

import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { typography, spacing } = theme;

type HeaderActionVariant = 'primary' | 'secondary' | 'danger' | 'muted';

interface HeaderActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: HeaderActionVariant;
  loading?: boolean;
}

const getVariantTextColor = (colors: ThemeColors): Record<HeaderActionVariant, string> => ({
  primary: colors.primary,
  secondary: colors.textPrimary,
  danger: colors.error,
  muted: colors.textSecondary,
});

export default function HeaderActionButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  loading = false,
}: HeaderActionButtonProps) {
  const colors = useThemeColors();
  const variantTextColor = getVariantTextColor(colors);
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.buttonDisabled]}
    >
      {loading ? (
        <ActivityIndicator color={variantTextColor[variant]} size="small" />
      ) : (
        <Text style={[styles.text, { color: variantTextColor[variant] }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

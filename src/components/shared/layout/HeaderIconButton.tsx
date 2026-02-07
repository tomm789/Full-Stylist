/**
 * HeaderIconButton Component
 * Shared icon-only action for headers.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';

const { spacing } = theme;

interface HeaderIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export default function HeaderIconButton({
  icon,
  onPress,
  size = 24,
  color,
  disabled = false,
  accessibilityLabel,
}: HeaderIconButtonProps) {
  const colors = useThemeColors();
  const iconColor = color ?? colors.textPrimary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

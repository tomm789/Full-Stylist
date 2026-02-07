/**
 * IconButton Component
 * Reusable icon-only button
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';

const { spacing, borderRadius } = theme;

interface IconButtonProps extends TouchableOpacityProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  variant?: 'default' | 'circle' | 'square';
  style?: ViewStyle;
}

export default function IconButton({
  icon,
  onPress,
  size = 24,
  color,
  backgroundColor,
  variant = 'default',
  disabled,
  style,
  ...props
}: IconButtonProps) {
  const colors = useThemeColors();
  const iconColor = color ?? colors.textPrimary;

  const buttonStyle = [
    variant !== 'default' && styles.button,
    variant === 'circle' && styles.circle,
    variant === 'square' && styles.square,
    backgroundColor && { backgroundColor },
    disabled && styles.disabled,
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...props}
    >
      <Ionicons name={icon} size={size} color={disabled ? colors.gray400 : iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderRadius: borderRadius.round,
  },
  square: {
    borderRadius: borderRadius.md,
  },
  disabled: {
    opacity: 0.5,
  },
});

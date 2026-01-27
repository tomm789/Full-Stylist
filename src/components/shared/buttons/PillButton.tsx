/**
 * PillButton Component
 * Reusable pill-shaped button for categories, filters, tags
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface PillButtonProps extends TouchableOpacityProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  onRemove?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function PillButton({
  label,
  onPress,
  selected = false,
  onRemove,
  icon,
  size = 'medium',
  variant = 'default',
  disabled,
  style,
  textStyle,
  ...props
}: PillButtonProps) {
  const pillStyle = [
    styles.pill,
    styles[size],
    selected && styles[`${variant}Selected`],
    disabled && styles.disabled,
    style,
  ];

  const pillTextStyle = [
    styles.pillText,
    styles[`${size}Text`],
    selected && styles[`${variant}SelectedText`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={pillStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      {...props}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={size === 'small' ? 14 : size === 'medium' ? 16 : 18}
          color={selected ? colors.white : colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Text style={pillTextStyle}>{label}</Text>
      {onRemove && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={styles.removeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={16} color={colors.gray600} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  
  // Sizes
  small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    gap: spacing.xs / 2,
  },
  medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  
  // Selected states
  defaultSelected: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  primarySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondarySelected: {
    backgroundColor: colors.gray800,
    borderColor: colors.gray800,
  },
  
  // Text styles
  pillText: {
    fontWeight: typography.fontWeight.regular,
    color: colors.textSecondary,
  },
  smallText: {
    fontSize: typography.fontSize.xs,
  },
  mediumText: {
    fontSize: typography.fontSize.sm,
  },
  largeText: {
    fontSize: typography.fontSize.md,
  },
  defaultSelectedText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  primarySelectedText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  secondarySelectedText: {
    color: colors.white,
    fontWeight: typography.fontWeight.semibold,
  },
  
  // Icon and remove button
  icon: {
    marginRight: spacing.xs / 2,
  },
  removeButton: {
    marginLeft: spacing.xs / 2,
    padding: spacing.xs / 2,
  },
  
  // Disabled
  disabled: {
    opacity: 0.5,
  },
});

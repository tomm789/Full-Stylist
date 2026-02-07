/**
 * PrimaryButton Component
 * Reusable button with consistent styling (variants, sizes, loading, optional icon)
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';

const { spacing, typography } = theme;

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';
type ButtonSize = 'small' | 'medium' | 'large';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  disabled,
  style,
  textStyle,
  ...props
}: PrimaryButtonProps) {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const isDisabled = !!disabled || loading;

  const variantStyleMap: Record<ButtonVariant, any> = {
    primary: commonStyles.buttonPrimary,
    secondary: commonStyles.buttonSecondary,
    danger: commonStyles.buttonDanger,
    outline: commonStyles.buttonOutline,
  };

  const variantTextStyleMap: Record<ButtonVariant, any> = {
    primary: commonStyles.buttonTextPrimary,
    secondary: commonStyles.buttonTextSecondary,
    danger: commonStyles.buttonTextPrimary,
    outline: commonStyles.buttonTextSecondary,
  };

  const buttonStyle = [
    styles.buttonBase,
    styles[size],
    variantStyleMap[variant],
    fullWidth && styles.fullWidth,
    isDisabled && commonStyles.buttonDisabled,
    style,
  ];

  const labelStyle = [
    commonStyles.buttonText,
    styles[`${size}Text` as const],
    variantTextStyleMap[variant],
    textStyle,
  ];

  const loaderColor =
    variant === 'primary' || variant === 'danger' ? colors.textLight : colors.primary;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={loaderColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={labelStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    gap: spacing.sm,
  },

  // Sizes (padding)
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  medium: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  // Text sizes
  smallText: {
    fontSize: typography.fontSize.sm,
  },
  mediumText: {
    fontSize: typography.fontSize.base,
  },
  largeText: {
    fontSize: typography.fontSize.lg,
  },

  // Layout
  fullWidth: {
    width: '100%',
  },
});

/**
 * LoadingSpinner Component
 * Inline loading spinner with optional text
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';

const { spacing, typography } = theme;

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  style?: ViewStyle;
}

export default function LoadingSpinner({
  size = 'small',
  color,
  text,
  style,
}: LoadingSpinnerProps) {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const resolvedColor = color ?? colors.primary;
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={resolvedColor} />
      {text && <Text style={commonStyles.loadingText}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

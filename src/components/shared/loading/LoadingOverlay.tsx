/**
 * LoadingOverlay Component
 * Full-screen loading overlay with optional message
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography, shadows } = theme;

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  style?: ViewStyle;
}

export default function LoadingOverlay({
  visible,
  message,
  subMessage,
  style,
}: LoadingOverlayProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, style]}>
          <ActivityIndicator size="large" color={colors.primary} />
          {message && <Text style={styles.message}>{message}</Text>}
          {subMessage && <Text style={styles.subMessage}>{subMessage}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xxxl,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
    ...shadows.xl,
  },
  message: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subMessage: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.lineHeight.normal,
  },
});

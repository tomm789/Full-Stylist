/**
 * LoadingOverlay Component
 * Full-screen loading overlay with optional title, message, and action buttons.
 * Used as the single source of truth for all generation/processing overlays
 * (except the rich GenerationProgressModal on the outfit edit page).
 */

import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export interface LoadingOverlayAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

interface LoadingOverlayProps {
  visible: boolean;
  /** Bold heading (e.g. "Generating Headshot"). When provided, `message` renders as sub-text. */
  title?: string;
  /** When `title` is absent this renders as the heading (backward compatible). */
  message?: string;
  subMessage?: string;
  actions?: LoadingOverlayAction[];
  style?: ViewStyle;
}

export default function LoadingOverlay({
  visible,
  title,
  message,
  subMessage,
  actions,
  style,
}: LoadingOverlayProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          {title && <Text style={styles.title}>{title}</Text>}
          {message && (
            <Text style={title ? styles.subMessage : styles.message}>
              {message}
            </Text>
          )}
          {subMessage && <Text style={styles.subMessage}>{subMessage}</Text>}
          {actions && actions.length > 0 && (
            <View style={styles.actions}>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[
                    styles.actionButton,
                    action.variant === 'secondary'
                      ? styles.actionButtonSecondary
                      : styles.actionButtonPrimary,
                  ]}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      action.variant === 'secondary' && styles.actionButtonTextSecondary,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: spacing.xxxl,
    alignItems: 'center',
    width: '80%',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  actionButtonTextSecondary: {
    color: colors.primary,
  },
});

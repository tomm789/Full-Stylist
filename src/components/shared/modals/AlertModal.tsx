import React from 'react';
import { Modal, Pressable, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/theme';

export type AlertModalProps = {
  visible: boolean;
  title?: string;
  message: string;
  primaryText?: string;
  secondaryText?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  onClose?: () => void;
};

export function AlertModal({
  visible,
  title,
  message,
  primaryText = 'OK',
  secondaryText,
  onPrimary,
  onSecondary,
  onClose,
}: AlertModalProps) {
  const handleDismiss = onClose ?? onPrimary;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.container} onPress={() => {}}>
          {title != null && <Text style={styles.title}>{title}</Text>}
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            {secondaryText != null && onSecondary != null && (
              <TouchableOpacity style={styles.secondaryButton} onPress={onSecondary}>
                <Text style={styles.secondaryButtonText}>{secondaryText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.primaryButton} onPress={onPrimary}>
              <Text style={styles.primaryButtonText}>{primaryText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  message: {
    fontSize: typography.fontSize.md,
    color: colors.gray800,
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeight.normal,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  primaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.black,
  },
  primaryButtonText: {
    color: colors.textLight,
    fontWeight: typography.fontWeight.semibold,
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray200,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
});

/**
 * AddToHomeScreenInstructionsModal Component
 * Modal showing instructions for adding app to home screen on iOS
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { lightColors } from '@/styles/themeColors';
import type { ThemeColors } from '@/styles/themeColors';
import { theme } from '@/styles';

const { spacing, borderRadius, typography } = theme;

interface AddToHomeScreenInstructionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddToHomeScreenInstructionsModal({
  visible,
  onClose,
}: AddToHomeScreenInstructionsModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Web-only styles (React Native Web compatible)
  const webStyles: any = Platform.OS === 'web'
    ? {
        modalOverlay: {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: lightColors.overlayLight,
          justifyContent: 'flex-end' as const,
          zIndex: 10000,
        },
        modalContent: {
          backgroundColor: lightColors.background,
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          maxHeight: '80vh',
          paddingBottom: `calc(20px + env(safe-area-inset-bottom))`,
          boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.25)',
        },
        modalTitle: {
          fontSize: '22px',
          fontWeight: '700' as const,
          color: lightColors.textPrimary,
        },
        stepNumber: {
          width: '32px',
          height: '32px',
          borderRadius: '16px',
          backgroundColor: lightColors.primary,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          marginRight: '12px',
        },
        stepText: {
          fontSize: '16px',
          color: lightColors.textPrimary,
          lineHeight: '24px',
          flex: 1,
        },
        noteText: {
          fontSize: '14px',
          color: lightColors.textSecondary,
          lineHeight: '20px',
          fontStyle: 'italic' as const,
        },
        modalFooter: {
          paddingTop: '16px',
          paddingBottom: '20px',
          paddingHorizontal: '20px',
          borderTopWidth: '1px',
          borderTopColor: lightColors.borderLight,
        },
        gotItButton: {
          backgroundColor: lightColors.primary,
          borderRadius: '12px',
          paddingVertical: '14px',
          paddingHorizontal: '24px',
          alignItems: 'center' as const,
        },
        gotItButtonText: {
          color: lightColors.textLight,
          fontSize: '16px',
          fontWeight: '600' as const,
        },
      }
    : {};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, webStyles.modalOverlay as any]}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContent, webStyles.modalContent as any]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, webStyles.modalTitle as any]}>
              Add to Home Screen
            </Text>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.instructionsContainer}>
              <View style={styles.stepContainer}>
                <View style={[styles.stepNumber, webStyles.stepNumber as any]}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={[styles.stepText, webStyles.stepText as any]}>
                  Tap the <Text style={styles.boldText}>Share icon</Text> (square with arrow) in
                  Safari's toolbar at the bottom
                </Text>
              </View>

              <View style={styles.stepContainer}>
                <View style={[styles.stepNumber, webStyles.stepNumber as any]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, webStyles.stepText as any]}>
                  Scroll down in the share menu and tap{' '}
                  <Text style={styles.boldText}>"Add to Home Screen"</Text>
                </Text>
              </View>

              <View style={styles.stepContainer}>
                <View style={[styles.stepNumber, webStyles.stepNumber as any]}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={[styles.stepText, webStyles.stepText as any]}>
                  Tap <Text style={styles.boldText}>"Add"</Text> in the top right corner
                </Text>
              </View>

              <View style={styles.noteContainer}>
                <Text style={[styles.noteText, webStyles.noteText as any]}>
                  This installs the app like a native app on your home screen. You can launch it
                  anytime without opening Safari.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, webStyles.modalFooter as any]}>
            <TouchableOpacity
              style={[styles.gotItButton, webStyles.gotItButton as any]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.gotItButtonText, webStyles.gotItButtonText as any]}>
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  instructionsContainer: {
    paddingVertical: spacing.xl,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  stepNumberText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  stepText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: 24,
    flex: 1,
  },
  boldText: {
    fontWeight: typography.fontWeight.semibold,
  },
  noteContainer: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
  },
  noteText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalFooter: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  gotItButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

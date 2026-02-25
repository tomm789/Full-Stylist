/**
 * TutorialScreen
 * First-time wardrobe onboarding screen shown when the user has no items.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.xxxl,
      paddingBottom: theme.spacing.xxl,
      justifyContent: 'space-between',
    },
    content: {
      gap: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.md,
      color: colors.textSecondary,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: colors.textLight,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    laterButton: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    laterText: {
      color: colors.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      textDecorationLine: 'underline',
    },
  });

type TutorialScreenProps = {
  onStartPhoto: () => void;
  onStartUpload: () => void;
  onDismiss: () => void;
};

export default function TutorialScreen({
  onStartPhoto,
  onStartUpload,
  onDismiss,
}: TutorialScreenProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add your first wardrobe item</Text>
        <Text style={styles.subtitle}>
          Take a photo or upload an item to start building your wardrobe.
        </Text>

        <TouchableOpacity style={styles.primaryButton} onPress={onStartPhoto} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Take a photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onStartUpload}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Upload an item</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.laterButton} onPress={onDismiss} activeOpacity={0.7}>
        <Text style={styles.laterText}>Later</Text>
      </TouchableOpacity>
    </View>
  );
}

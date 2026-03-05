/**
 * BiometricLockScreen
 * Full-screen overlay shown when the app returns from background and biometric lock is enabled.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  title: {
    color: colors.textLight,
    fontSize: typography.fontSize.xxxl,
    fontWeight: typography.fontWeight.bold,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: typography.fontSize.base,
  },
  button: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.lg,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

interface BiometricLockScreenProps {
  biometricType: string | null;
  onAuthenticate: () => Promise<boolean>;
}

export default function BiometricLockScreen({
  biometricType,
  onAuthenticate,
}: BiometricLockScreenProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Auto-trigger authentication on mount
  useEffect(() => {
    onAuthenticate();
  }, [onAuthenticate]);

  const iconName = biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name={iconName} size={64} color={colors.textLight} />
        <Text style={styles.title}>Full Stylist</Text>
        <Text style={styles.subtitle}>
          {biometricType ? `Tap to unlock with ${biometricType}` : 'Tap to unlock'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={onAuthenticate}>
          <Text style={styles.buttonText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

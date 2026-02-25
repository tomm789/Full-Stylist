/**
 * GeneratingView — body shot generation in-progress screen.
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from './styles';

type GeneratingViewProps = {
  onContinue: () => void;
};

export function GeneratingView({ onContinue }: GeneratingViewProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.generatingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.generatingTitle}>Generating your new body shot…</Text>
      <Text style={styles.generatingSubtext}>
        An outfit cannot be generated until it's ready, but you can continue customizing your
        outfit.
      </Text>
      <TouchableOpacity
        style={[styles.actionButton, styles.actionButtonPrimary, styles.continueButton]}
        onPress={onContinue}
        activeOpacity={0.7}
      >
        <Text style={styles.actionButtonPrimaryText}>Continue customizing</Text>
      </TouchableOpacity>
    </View>
  );
}

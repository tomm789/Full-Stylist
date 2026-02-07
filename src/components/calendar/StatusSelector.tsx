/**
 * StatusSelector Component
 * Select entry status (planned/worn/skipped)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface StatusSelectorProps {
  status: 'planned' | 'worn' | 'skipped';
  onStatusChange: (status: 'planned' | 'worn' | 'skipped') => void;
  disabled?: boolean;
}

export default function StatusSelector({
  status,
  onStatusChange,
  disabled = false,
}: StatusSelectorProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const statuses: Array<'planned' | 'worn' | 'skipped'> = ['planned', 'worn', 'skipped'];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Status</Text>
      <View style={styles.statusGroup}>
        {statuses.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.statusOption, status === s && styles.statusOptionSelected]}
            onPress={() => onStatusChange(s)}
            disabled={disabled}
          >
            <Text style={[styles.statusText, status === s && styles.statusTextSelected]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.lg + spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm + spacing.xs / 2,
    color: colors.textPrimary,
  },
  statusGroup: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs / 2,
  },
  statusOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + spacing.xs / 2,
    alignItems: 'center',
  },
  statusOptionSelected: {
    borderColor: colors.black,
    backgroundColor: colors.black,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
});

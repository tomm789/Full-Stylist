/**
 * Select Component
 * Reusable select/dropdown component with expandable options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  error?: string;
}

export default function Select({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  required,
  disabled,
  containerStyle,
  error,
}: SelectProps) {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const [expanded, setExpanded] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setExpanded(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {selectedOption && !expanded ? (
        <TouchableOpacity
          style={[styles.selected, error && styles.selectedError]}
          onPress={() => !disabled && setExpanded(true)}
          disabled={disabled}
        >
          <Text style={styles.selectedText}>{selectedOption.label}</Text>
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.optionsList}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                value === option.value && styles.optionSelected,
              ]}
              onPress={() => handleSelect(option.value)}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.optionText,
                  value === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  selected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: '#e7f3ff',
  },
  selectedError: {
    borderColor: colors.error,
  },
  selectedText: {
    fontSize: typography.fontSize.md,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  optionsList: {
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#e7f3ff',
  },
  optionText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
});

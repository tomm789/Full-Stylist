/**
 * VisibilitySelector Component
 * Collapsible dropdown for selecting item visibility
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

type VisibilityType = 'public' | 'followers' | 'private_link' | 'private' | 'inherit';

interface VisibilitySelectorProps {
  value: VisibilityType;
  onChange: (value: VisibilityType) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  showInherit?: boolean;
}

const VISIBILITY_OPTIONS: Array<{ value: VisibilityType; label: string; description: string }> = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'followers', label: 'Followers', description: 'Only followers can see' },
  { value: 'private_link', label: 'Private Link', description: 'Anyone with link can see' },
  { value: 'private', label: 'Private', description: 'Only you can see' },
  { value: 'inherit', label: 'Inherit', description: 'Use default setting' },
];

export const VisibilitySelector = ({
  value,
  onChange,
  expanded,
  onToggleExpanded,
  showInherit = true,
}: VisibilitySelectorProps) => {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const options = showInherit ? VISIBILITY_OPTIONS : VISIBILITY_OPTIONS.filter(o => o.value !== 'inherit');
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Visibility</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={onToggleExpanded}
      >
        <View style={styles.selectedValue}>
          <Text style={styles.selectedText}>{selectedOption.label}</Text>
          <Text style={styles.descriptionText}>{selectedOption.description}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                value === option.value && styles.optionSelected,
              ]}
              onPress={() => {
                onChange(option.value);
                onToggleExpanded();
              }}
            >
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  value === option.value && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {value === option.value && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  selectedValue: {
    flex: 1,
  },
  selectedText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  dropdown: {
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  optionSelected: {
    backgroundColor: colors.background,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  optionLabelSelected: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  optionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});

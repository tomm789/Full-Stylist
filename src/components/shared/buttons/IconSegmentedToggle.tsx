import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';

const { spacing, borderRadius, typography } = theme;

type ToggleOption = {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type IconSegmentedToggleProps = {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  showLabelWhenActiveOnly?: boolean;
  style?: ViewStyle;
};

export default function IconSegmentedToggle({
  options,
  value,
  onChange,
  showLabelWhenActiveOnly = false,
  style,
}: IconSegmentedToggleProps) {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundSecondary,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const active = option.value === value;
        const iconColor = active ? colors.textLight : colors.textSecondary;
        const textColor = active ? colors.textLight : colors.textSecondary;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, active && { backgroundColor: colors.black }]}
            onPress={() => onChange(option.value)}
            accessibilityLabel={`Select ${option.label}`}
          >
            <Ionicons name={option.icon} size={16} color={iconColor} />
            {(!showLabelWhenActiveOnly || active) && (
              <Text style={[styles.label, { color: textColor }, active && styles.labelActive]}>
                {option.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.round,
    padding: 2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  labelActive: {
    fontWeight: typography.fontWeight.semibold,
  },
});

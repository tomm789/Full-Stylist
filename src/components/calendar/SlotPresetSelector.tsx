/**
 * SlotPresetSelector Component
 * Select slot preset with option to create new ones
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalendarSlotPreset } from '@/lib/calendar';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface SlotPresetSelectorProps {
  presets: CalendarSlotPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  onCreatePreset: () => void;
}

export default function SlotPresetSelector({
  presets,
  selectedPresetId,
  onSelectPreset,
  onCreatePreset,
}: SlotPresetSelectorProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Slot Preset</Text>
      <View style={styles.presetsList}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.presetOption,
              selectedPresetId === preset.id && styles.presetOptionSelected,
            ]}
            onPress={() => onSelectPreset(preset.id)}
          >
            <Text
              style={[
                styles.presetText,
                selectedPresetId === preset.id && styles.presetTextSelected,
              ]}
            >
              {preset.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.createButton} onPress={onCreatePreset}>
        <Text style={styles.createButtonText}>+ Create Custom Slot</Text>
      </TouchableOpacity>
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
  presetsList: {
    gap: spacing.sm,
  },
  presetOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + spacing.xs / 2,
  },
  presetOptionSelected: {
    borderColor: colors.black,
    backgroundColor: colors.gray100,
  },
  presetText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  presetTextSelected: {
    color: colors.black,
    fontWeight: '600',
  },
  createButton: {
    marginTop: spacing.sm + spacing.xs / 2,
    padding: spacing.sm + spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

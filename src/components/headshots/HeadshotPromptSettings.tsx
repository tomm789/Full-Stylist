/**
 * HeadshotPromptSettings
 * Displays the prompt settings (hair/makeup presets + custom description)
 * used to generate a headshot variation. Shown below the face view slider.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { resolvePresetLabels } from '@/lib/headshot/presetUtils';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import type { ThemeColors } from '@/styles/themes';
import { theme } from '@/styles';

const { spacing, borderRadius, typography } = theme;

type HeadshotPromptSettingsProps = {
  variation: HeadshotGenerationVariation | null;
};

export default function HeadshotPromptSettings({ variation }: HeadshotPromptSettingsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const resolved = useMemo(() => {
    if (!variation?.input_snapshot_json) return null;
    const snapshot = variation.input_snapshot_json as {
      hairPresetIds?: string[];
      makeupPresetIds?: string[];
      customDescription?: string;
    };
    const allIds = [
      ...(snapshot.hairPresetIds || []),
      ...(snapshot.makeupPresetIds || []),
    ];
    const labels = resolvePresetLabels(allIds);
    const hairLabels = labels.filter((l) => l.type === 'hair');
    const makeupLabels = labels.filter((l) => l.type === 'makeup');
    const customDescription = snapshot.customDescription?.trim() || null;

    if (hairLabels.length === 0 && makeupLabels.length === 0 && !customDescription) {
      return null;
    }

    return { hairLabels, makeupLabels, customDescription };
  }, [variation]);

  if (!resolved) return null;

  return (
    <View style={styles.container}>
      {resolved.hairLabels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Hair</Text>
          <View style={styles.pillRow}>
            {resolved.hairLabels.map((item) => (
              <View key={item.id} style={styles.pill}>
                <Text style={styles.pillText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {resolved.makeupLabels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Makeup</Text>
          <View style={styles.pillRow}>
            {resolved.makeupLabels.map((item) => (
              <View key={item.id} style={styles.pill}>
                <Text style={styles.pillText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {resolved.customDescription && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Custom</Text>
          <Text style={styles.customText}>{resolved.customDescription}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },
  pillText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  customText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

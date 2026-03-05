/**
 * HeadshotPromptSettings
 * Displays the prompt settings used to generate a headshot variation.
 * Shown below the face view slider on the headshot view page.
 *
 * Supports: hair/makeup presets (pills), accessories/jewellery (pills),
 * advanced fields (label: value), custom description (italic text),
 * and draw mode color prompts (color circle + text).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { resolvePresetLabels } from '@/lib/headshot/presetUtils';
import {
  ADVANCED_FIELDS,
  ACCESSORY_SUBCATEGORIES,
  JEWELLERY_SUBCATEGORIES,
} from '@/lib/headshot/hairAndMakeupTypes';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import type { ThemeColors } from '@/styles/themeColors';
import { theme } from '@/styles';

const { spacing, borderRadius, typography } = theme;

type SnapshotShape = {
  hairPresetIds?: string[];
  makeupPresetIds?: string[];
  customDescription?: string;
  accessorySubcategory?: string | null;
  jewellerySubcategory?: string | null;
  advancedFields?: Record<string, string>;
  drawColorMap?: Array<{ hex: string; customPrompt: string }>;
};

type HeadshotPromptSettingsProps = {
  variation: HeadshotGenerationVariation | null;
};

export default function HeadshotPromptSettings({ variation }: HeadshotPromptSettingsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const resolved = useMemo(() => {
    if (!variation?.input_snapshot_json) return null;
    const snapshot = variation.input_snapshot_json as SnapshotShape;

    // Preset pills
    const allIds = [
      ...(snapshot.hairPresetIds || []),
      ...(snapshot.makeupPresetIds || []),
    ];
    const labels = resolvePresetLabels(allIds);
    const hairLabels = labels.filter((l) => l.type === 'hair');
    const makeupLabels = labels.filter((l) => l.type === 'makeup');

    // Custom description
    const customDescription = snapshot.customDescription?.trim() || null;

    // Accessories
    const accessoryLabel = snapshot.accessorySubcategory
      ? ACCESSORY_SUBCATEGORIES.find((s) => s.id === snapshot.accessorySubcategory)?.name
        ?? snapshot.accessorySubcategory.replace(/-/g, ' ')
      : null;

    // Jewellery
    const jewelleryLabel = snapshot.jewellerySubcategory
      ? JEWELLERY_SUBCATEGORIES.find((s) => s.id === snapshot.jewellerySubcategory)?.name
        ?? snapshot.jewellerySubcategory.replace(/-/g, ' ')
      : null;

    // Advanced fields (only non-empty)
    const advancedEntries = snapshot.advancedFields
      ? Object.entries(snapshot.advancedFields)
          .filter(([, v]) => v && v.trim().length > 0)
          .map(([key, value]) => ({
            id: key,
            label: ADVANCED_FIELDS.find((f) => f.id === key)?.label
              ?? key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: value.trim(),
          }))
      : [];

    // Draw color prompts
    const drawEntries = snapshot.drawColorMap ?? [];

    const hasContent =
      hairLabels.length > 0 ||
      makeupLabels.length > 0 ||
      !!customDescription ||
      !!accessoryLabel ||
      !!jewelleryLabel ||
      advancedEntries.length > 0 ||
      drawEntries.length > 0;

    if (!hasContent) return null;

    return {
      hairLabels,
      makeupLabels,
      customDescription,
      accessoryLabel,
      jewelleryLabel,
      advancedEntries,
      drawEntries,
    };
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

      {resolved.accessoryLabel && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Accessories</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{resolved.accessoryLabel}</Text>
            </View>
          </View>
        </View>
      )}

      {resolved.jewelleryLabel && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Jewellery</Text>
          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{resolved.jewelleryLabel}</Text>
            </View>
          </View>
        </View>
      )}

      {resolved.advancedEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Advanced</Text>
          {resolved.advancedEntries.map((entry) => (
            <View key={entry.id} style={styles.advancedRow}>
              <Text style={styles.advancedLabel}>{entry.label}</Text>
              <Text style={styles.advancedValue}>{entry.value}</Text>
            </View>
          ))}
        </View>
      )}

      {resolved.customDescription && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Custom</Text>
          <Text style={styles.customText}>{resolved.customDescription}</Text>
        </View>
      )}

      {resolved.drawEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Draw</Text>
          {resolved.drawEntries.map((entry, index) => (
            <View key={`${entry.hex}-${index}`} style={styles.drawRow}>
              <View style={[styles.drawColorCircle, { backgroundColor: entry.hex }]} />
              <Text style={styles.drawPromptText}>{entry.customPrompt}</Text>
            </View>
          ))}
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
  advancedRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  advancedLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
    minWidth: 100,
  },
  advancedValue: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  drawRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  drawColorCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: 2,
    flexShrink: 0,
  },
  drawPromptText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
});

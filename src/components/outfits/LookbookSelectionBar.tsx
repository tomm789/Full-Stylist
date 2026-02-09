/**
 * LookbookSelectionBar Component
 * Shows selected outfits and quick actions for lookbook creation.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, typography, spacing, borderRadius } from '@/styles';
import { LookbookCreatorBar } from '@/components/lookbooks';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

type SelectedOutfit = {
  id: string;
  imageUrl: string | null;
};

type LookbookSelectionBarProps = {
  selectedOutfits: SelectedOutfit[];
  selectionCount: number;
  isSaving: boolean;
  onRemoveOutfit: (outfitId: string) => void;
  onExit: () => void;
  onOpenPicker: () => void;
  hintMessage?: string;
};

export default function LookbookSelectionBar({
  selectedOutfits,
  selectionCount,
  isSaving,
  onRemoveOutfit,
  onExit,
  onOpenPicker,
  hintMessage,
}: LookbookSelectionBarProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View>
      {hintMessage && selectionCount === 0 ? (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{hintMessage}</Text>
          <TouchableOpacity onPress={onExit} style={styles.hintClose}>
            <Text style={styles.hintCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <LookbookCreatorBar
          selectedOutfits={selectedOutfits}
          onRemoveOutfit={onRemoveOutfit}
          onExit={onExit}
        />
      )}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            (selectionCount === 0 || isSaving) && styles.actionButtonDisabled,
          ]}
          disabled={selectionCount === 0 || isSaving}
          onPress={onOpenPicker}
        >
          <Text style={styles.actionButtonText}>Add to Lookbook</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actionBar: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  actionButton: {
    backgroundColor: colors.textPrimary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  hintText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  hintClose: {
    paddingLeft: spacing.md,
  },
  hintCloseText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});

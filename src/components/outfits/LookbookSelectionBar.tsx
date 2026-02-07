/**
 * LookbookSelectionBar Component
 * Shows selected outfits and quick actions for lookbook creation.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme, colors, typography, spacing, borderRadius } from '@/styles';
import { LookbookCreatorBar } from '@/components/lookbooks';

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
};

export default function LookbookSelectionBar({
  selectedOutfits,
  selectionCount,
  isSaving,
  onRemoveOutfit,
  onExit,
  onOpenPicker,
}: LookbookSelectionBarProps) {
  return (
    <View>
      <LookbookCreatorBar
        selectedOutfits={selectedOutfits}
        onRemoveOutfit={onRemoveOutfit}
        onExit={onExit}
      />
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

const styles = StyleSheet.create({
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
});

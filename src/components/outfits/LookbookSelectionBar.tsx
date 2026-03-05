/**
 * LookbookSelectionBar Component
 * Two-part floating bottom overlay for lookbook creation:
 *  - LookbookCreatorPanel (expandable panel) positioned above the action pill
 *  - A CreatorBar action pill at the bottom
 * Mirrors the OutfitCreatorPanel + CreatorBar pattern used in the wardrobe screen.
 */

import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, spacing } from '@/styles';
import { LookbookCreatorPanel } from '@/components/lookbooks';
import { CreatorBar } from '@/components/shared';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const CREATOR_BAR_HEIGHT = 60;

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
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Local ordered list — preserves user-defined drag order while tracking
  // external selection changes (additions/removals from the outfit grid).
  const [orderedOutfits, setOrderedOutfits] = useState<SelectedOutfit[]>(selectedOutfits);

  useEffect(() => {
    setOrderedOutfits((prev) => {
      // Append outfits newly added to selectedOutfits
      const prevIds = new Set(prev.map((o) => o.id));
      const additions = selectedOutfits.filter((o) => !prevIds.has(o.id));
      // Remove outfits that are no longer selected
      const selectedIds = new Set(selectedOutfits.map((o) => o.id));
      const filtered = prev.filter((o) => selectedIds.has(o.id));
      return additions.length > 0 ? [...filtered, ...additions] : filtered;
    });
  }, [selectedOutfits]);

  // Panel sits just above the CreatorBar pill
  const panelBottomOffset = spacing.xl + CREATOR_BAR_HEIGHT + spacing.sm;

  return (
    <>
      {/* Hint card — only when no outfits selected yet */}
      {hintMessage && selectionCount === 0 && (
        <View style={styles.hintPanel}>
          <Text style={styles.hintText}>{hintMessage}</Text>
          <TouchableOpacity onPress={onExit} style={styles.hintClose}>
            <Text style={styles.hintCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expandable panel — visible once outfits are selected */}
      {selectionCount > 0 && (
        <LookbookCreatorPanel
          outfits={orderedOutfits}
          onReorder={setOrderedOutfits}
          onRemoveOutfit={onRemoveOutfit}
          onExit={onExit}
          bottomOffset={panelBottomOffset}
        />
      )}

      {/* Action pill — only visible once outfits are selected */}
      {selectionCount > 0 && (
        <CreatorBar
          label="Add to Lookbook"
          icon="book-outline"
          onGenerate={onOpenPicker}
          isGenerating={isSaving}
          showOptionsButton={false}
        />
      )}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  hintPanel: {
    position: 'absolute',
    bottom: spacing.xl + CREATOR_BAR_HEIGHT + spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
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

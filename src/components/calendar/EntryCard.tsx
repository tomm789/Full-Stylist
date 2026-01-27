/**
 * EntryCard Component
 * Calendar entry card with reorder buttons and quick actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CalendarEntry, CalendarSlotPreset } from '@/lib/calendar';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface EntryCardProps {
  entry: CalendarEntry;
  slotPresets: CalendarSlotPreset[];
  outfits: any[];
  outfitImages: Map<string, string | null>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewOutfit: (outfitId: string) => void;
  onStatusChange: (status: 'planned' | 'worn' | 'skipped') => void;
}

export default function EntryCard({
  entry,
  slotPresets,
  outfits,
  outfitImages,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  onViewOutfit,
  onStatusChange,
}: EntryCardProps) {
  const getPresetName = (): string => {
    if (entry.slot_preset_id) {
      const preset = slotPresets.find((p) => p.id === entry.slot_preset_id);
      return preset?.name || 'Unknown';
    }
    return entry.custom_label || 'Custom';
  };

  const getOutfitTitle = (): string | null => {
    if (entry.outfit_id) {
      const outfit = outfits.find((o) => o.id === entry.outfit_id);
      return outfit?.title || null;
    }
    return null;
  };

  const imageUrl = entry.outfit_id ? outfitImages.get(entry.outfit_id) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.reorderButtons}>
            <TouchableOpacity
              onPress={onMoveUp}
              disabled={!canMoveUp}
              style={styles.reorderButton}
            >
              <Text style={[styles.reorderButtonText, !canMoveUp && styles.reorderButtonDisabled]}>
                ↑
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMoveDown}
              disabled={!canMoveDown}
              style={styles.reorderButton}
            >
              <Text
                style={[styles.reorderButtonText, !canMoveDown && styles.reorderButtonDisabled]}
              >
                ↓
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.presetName}>{getPresetName()}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteButton}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {entry.outfit_id && (
        <View style={styles.outfitSection}>
          <TouchableOpacity
            style={styles.outfitCard}
            onPress={() => onViewOutfit(entry.outfit_id!)}
            activeOpacity={0.7}
          >
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.outfitImage} contentFit="cover" />
            ) : (
              <View style={styles.outfitImagePlaceholder}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            <View style={styles.outfitInfo}>
              <Text
                style={[
                  styles.statusBadge,
                  entry.status === 'worn' && styles.statusWorn,
                  entry.status === 'skipped' && styles.statusSkipped,
                ]}
              >
                {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
              </Text>
              <Text style={styles.outfitTitle}>{getOutfitTitle() || 'Unknown Outfit'}</Text>
              <Text style={styles.tapToView}>Tap to view</Text>
            </View>
          </TouchableOpacity>

          {/* Quick Status Actions */}
          <View style={styles.statusActions}>
            <TouchableOpacity
              style={[
                styles.statusActionButton,
                entry.status === 'worn' && styles.statusActionButtonActive,
              ]}
              onPress={() => onStatusChange(entry.status === 'worn' ? 'planned' : 'worn')}
            >
              <Text
                style={[
                  styles.statusActionText,
                  entry.status === 'worn' && styles.statusActionTextActive,
                ]}
              >
                ✓ Worn
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusActionButton,
                entry.status === 'skipped' && styles.statusActionButtonActive,
              ]}
              onPress={() => onStatusChange(entry.status === 'skipped' ? 'planned' : 'skipped')}
            >
              <Text
                style={[
                  styles.statusActionText,
                  entry.status === 'skipped' && styles.statusActionTextActive,
                ]}
              >
                × Skipped
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {entry.notes && <Text style={styles.notes}>{entry.notes}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs / 2,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  editButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  reorderButtons: {
    flexDirection: 'column',
    gap: 2,
  },
  reorderButton: {
    padding: 2,
  },
  reorderButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  reorderButtonDisabled: {
    color: colors.gray300,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  deleteButton: {
    fontSize: 24,
    color: colors.error,
    fontWeight: 'bold',
  },
  outfitSection: {
    marginTop: spacing.sm + spacing.xs / 2,
    marginBottom: spacing.sm,
  },
  outfitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm + spacing.xs / 2,
  },
  outfitImage: {
    width: 140,
    height: 180,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  outfitImagePlaceholder: {
    width: 140,
    height: 180,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  outfitInfo: {
    flex: 1,
    paddingTop: spacing.xs / 2,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.gray200,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.xs / 2,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  statusWorn: {
    backgroundColor: colors.success,
    color: colors.white,
  },
  statusSkipped: {
    backgroundColor: colors.warning,
    color: colors.white,
  },
  outfitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  tapToView: {
    fontSize: 12,
    color: colors.primary,
    marginTop: spacing.xs / 2,
  },
  statusActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs / 2,
  },
  statusActionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.xs + spacing.xs / 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  statusActionButtonActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  statusActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusActionTextActive: {
    color: colors.white,
  },
  notes: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

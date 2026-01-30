/**
 * CalendarDayEntryForm Component
 * Modal form for adding/editing calendar entries
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  SlotPresetSelector,
  OutfitGridPicker,
  StatusSelector,
} from '@/components/calendar';
import { PrimaryButton } from '@/components/shared';
import { theme } from '@/styles';
import { CalendarEntry } from '@/lib/calendar';

const { colors, spacing, borderRadius } = theme;

interface CalendarDayEntryFormProps {
  visible: boolean;
  editingEntry: CalendarEntry | null;
  presets: any[];
  outfits: any[];
  outfitImages: Map<string, string | null>;
  showOutfitPicker?: boolean;
  selectedPreset: string | null;
  selectedOutfit: string | null;
  entryStatus: 'planned' | 'worn' | 'skipped';
  editNotes: string;
  saving: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string | null) => void;
  onSelectOutfit: (outfitId: string | null) => void;
  onStatusChange: (status: 'planned' | 'worn' | 'skipped') => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  onCreatePreset: () => void;
}

export function CalendarDayEntryForm({
  visible,
  editingEntry,
  presets,
  outfits,
  outfitImages,
  showOutfitPicker = true,
  selectedPreset,
  selectedOutfit,
  entryStatus,
  editNotes,
  saving,
  onClose,
  onSelectPreset,
  onSelectOutfit,
  onStatusChange,
  onNotesChange,
  onSubmit,
  onCreatePreset,
}: CalendarDayEntryFormProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingEntry ? 'Edit Calendar Entry' : 'Add Calendar Entry'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <SlotPresetSelector
              presets={presets}
              selectedPresetId={selectedPreset}
              onSelectPreset={onSelectPreset}
              onCreatePreset={onCreatePreset}
            />

            {showOutfitPicker && (
              <OutfitGridPicker
                outfits={outfits}
                outfitImages={outfitImages}
                selectedOutfitId={selectedOutfit}
                onSelectOutfit={onSelectOutfit}
              />
            )}

            <StatusSelector
              status={entryStatus}
              onStatusChange={onStatusChange}
              disabled={saving}
            />

            <View style={styles.section}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Add notes about this entry"
                value={editNotes}
                onChangeText={onNotesChange}
                multiline
                numberOfLines={3}
                editable={!saving}
              />
            </View>

            <PrimaryButton
              title={editingEntry ? 'Update Entry' : 'Add Entry'}
              onPress={onSubmit}
              loading={saving}
              disabled={saving}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  modalBody: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg + spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm + spacing.xs / 2,
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + spacing.xs / 2,
    fontSize: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm + spacing.xs / 2,
  },
});

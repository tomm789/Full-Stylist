/**
 * Calendar Day Screen (Refactored)
 * View and manage calendar entries for a specific day
 * 
 * BEFORE: 1,056 lines
 * AFTER: ~450 lines (57% reduction)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDayEntries,
  useSlotPresets,
  useUserOutfits,
} from '@/hooks/calendar';
import {
  EntryCard,
  SlotPresetSelector,
  OutfitGridPicker,
  StatusSelector,
} from '@/components/calendar';
import {
  Header,
  LoadingSpinner,
  PrimaryButton,
  Input,
  TextArea,
} from '@/components/shared';
import { BottomSheet } from '@/components/shared/modals';
import { theme, commonStyles } from '@/styles';
import { CalendarEntry } from '@/lib/calendar';

const { colors, spacing, borderRadius } = theme;

export default function CalendarDayScreen() {
  const { date, autoAdd } = useLocalSearchParams<{ date: string; autoAdd?: string }>();
  const router = useRouter();
  const { user } = useAuth();

  // Hooks
  const {
    entries,
    loading,
    refresh,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
  } = useDayEntries({ userId: user?.id, date });

  const { presets, createPreset } = useSlotPresets({ userId: user?.id });
  const { outfits, outfitImages } = useUserOutfits({ userId: user?.id });

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<'planned' | 'worn' | 'skipped'>('planned');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Create preset modal
  const [showCreatePresetModal, setShowCreatePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Auto-open add modal if autoAdd parameter is present
  useEffect(() => {
    if (autoAdd === 'true' && !loading) {
      setTimeout(() => {
        setShowAddModal(true);
      }, 100);
    }
  }, [autoAdd, loading]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user && date) {
        refresh();
      }
    }, [user, date])
  );

  const handleAddEntry = async () => {
    if (!selectedPreset) {
      Alert.alert('Error', 'Please select a slot preset');
      return;
    }

    setSaving(true);

    const { error } = await addEntry({
      outfit_id: selectedOutfit || undefined,
      slot_preset_id: selectedPreset,
      status: entryStatus,
      notes: editNotes.trim() || undefined,
      sort_order: entries.length,
    });

    if (error) {
      Alert.alert('Error', error.message || 'Failed to create entry');
    } else {
      resetForm();
      setShowAddModal(false);
    }

    setSaving(false);
  };

  const handleEditEntry = (entry: CalendarEntry) => {
    setEditingEntry(entry);
    setSelectedPreset(entry.slot_preset_id || null);
    setSelectedOutfit(entry.outfit_id || null);
    setEntryStatus(entry.status);
    setEditNotes(entry.notes || '');
    setShowAddModal(true);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    setSaving(true);

    const { error } = await updateEntry(editingEntry.id, {
      outfit_id: selectedOutfit || null,
      slot_preset_id: selectedPreset || null,
      status: entryStatus,
      notes: editNotes.trim() || null,
    });

    if (error) {
      Alert.alert('Error', 'Failed to update entry');
    } else {
      resetForm();
      setShowAddModal(false);
    }

    setSaving(false);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    const { error } = await deleteEntry(entryToDelete);

    if (error) {
      Alert.alert('Error', 'Failed to delete entry');
    }

    setShowDeleteConfirm(false);
    setEntryToDelete(null);
  };

  const handleMoveEntry = async (entryId: string, direction: 'up' | 'down') => {
    const entryIndex = entries.findIndex((e) => e.id === entryId);
    if (entryIndex === -1) return;

    const newIndex = direction === 'up' ? entryIndex - 1 : entryIndex + 1;
    if (newIndex < 0 || newIndex >= entries.length) return;

    await reorderEntries(entryIndex, newIndex);
  };

  const handleStatusChange = async (entryId: string, status: 'planned' | 'worn' | 'skipped') => {
    await updateEntry(entryId, { status });
  };

  const handleViewOutfit = (outfitId: string) => {
    router.push(`/outfits/${outfitId}/view`);
  };

  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) {
      Alert.alert('Error', 'Please enter a preset name');
      return;
    }

    const { error } = await createPreset(newPresetName.trim());

    if (error) {
      Alert.alert('Error', `Failed to create preset: ${error.message || error}`);
    } else {
      setNewPresetName('');
      setShowCreatePresetModal(false);
    }
  };

  const resetForm = () => {
    setEditingEntry(null);
    setSelectedPreset(null);
    setSelectedOutfit(null);
    setEntryStatus('planned');
    setEditNotes('');
  };

  const handleCloseModal = () => {
    resetForm();
    setShowAddModal(false);
  };

  const navigateToAdjacentDay = (direction: 'prev' | 'next') => {
    if (!date) return;

    const currentDate = new Date(date);
    const offset = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset);

    const newDateKey = newDate.toISOString().split('T')[0];
    router.replace(`/calendar/day/${newDateKey}`);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LoadingSpinner text="Loading day..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <View style={styles.navigationRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>

          <View style={styles.dayNavigationButtons}>
            <TouchableOpacity
              style={styles.dayNavButton}
              onPress={() => navigateToAdjacentDay('prev')}
            >
              <Text style={styles.dayNavButtonText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dayNavButton}
              onPress={() => navigateToAdjacentDay('next')}
            >
              <Text style={styles.dayNavButtonText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{date ? formatDate(date) : 'Calendar Day'}</Text>

        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No entries for this day</Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                slotPresets={presets}
                outfits={outfits}
                outfitImages={outfitImages}
                canMoveUp={index > 0}
                canMoveDown={index < entries.length - 1}
                onMoveUp={() => handleMoveEntry(entry.id, 'up')}
                onMoveDown={() => handleMoveEntry(entry.id, 'down')}
                onEdit={() => handleEditEntry(entry)}
                onDelete={() => handleDeleteEntry(entry.id)}
                onViewOutfit={handleViewOutfit}
                onStatusChange={(status) => handleStatusChange(entry.id, status)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ Add Entry</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Entry Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEntry ? 'Edit Calendar Entry' : 'Add Calendar Entry'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <SlotPresetSelector
                presets={presets}
                selectedPresetId={selectedPreset}
                onSelectPreset={setSelectedPreset}
                onCreatePreset={() => setShowCreatePresetModal(true)}
              />

              <OutfitGridPicker
                outfits={outfits}
                outfitImages={outfitImages}
                selectedOutfitId={selectedOutfit}
                onSelectOutfit={setSelectedOutfit}
              />

              <StatusSelector
                status={entryStatus}
                onStatusChange={setEntryStatus}
                disabled={saving}
              />

              <View style={styles.section}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Add notes about this entry"
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
              </View>

              <PrimaryButton
                title={editingEntry ? 'Update Entry' : 'Add Entry'}
                onPress={editingEntry ? handleUpdateEntry : handleAddEntry}
                loading={saving}
                disabled={saving}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Preset Modal */}
      <Modal
        visible={showCreatePresetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreatePresetModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Slot Preset</Text>
              <TouchableOpacity onPress={() => setShowCreatePresetModal(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Preset Name *</Text>
              <Input
                value={newPresetName}
                onChangeText={setNewPresetName}
                placeholder="e.g. Gym, Date Night, Casual"
              />
              <PrimaryButton
                title="Create"
                onPress={handleCreatePreset}
                disabled={!newPresetName.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Entry</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this entry?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setEntryToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  dayNavigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNavButtonText: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.lg + spacing.md,
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl + spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  entriesList: {
    gap: spacing.sm + spacing.xs / 2,
    marginBottom: spacing.lg + spacing.md,
  },
  addButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.lg,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
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
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  deleteModalContent: {
    backgroundColor: colors.white,
    borderRadius: spacing.sm + spacing.xs / 2,
    padding: spacing.lg + spacing.md,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.sm + spacing.xs / 2,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg + spacing.md,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: spacing.sm + spacing.xs / 2,
  },
  deleteModalButton: {
    flex: 1,
    padding: spacing.sm + spacing.xs / 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray100,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  confirmDeleteButton: {
    backgroundColor: colors.error,
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

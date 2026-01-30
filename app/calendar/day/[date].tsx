/**
 * Calendar Day Screen (Refactored)
 * View and manage calendar entries for a specific day
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDayEntries,
  useSlotPresets,
  useUserOutfits,
  useCalendarDayForm,
} from '@/hooks/calendar';
import {
  EntryCard,
  CalendarDayHeader,
  CalendarDayEntryForm,
  CreatePresetModal,
} from '@/components/calendar';
import { LoadingSpinner } from '@/components/shared';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, borderRadius } = theme;

export default function CalendarDayScreen() {
  const { date, autoAdd } = useLocalSearchParams<{
    date: string;
    autoAdd?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  // Data hooks
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

  // Form hook
  const form = useCalendarDayForm({
    entries,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
  });

  // Auto-open add modal if autoAdd parameter is present
  useEffect(() => {
    if (autoAdd === 'true' && !loading) {
      const t = setTimeout(() => {
        form.setShowAddModal(true);
      }, 100);
  
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdd, loading]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user && date) {
        refresh();
      }
    }, [user, date, refresh])
  );

  const navigateToAdjacentDay = (direction: 'prev' | 'next') => {
    if (!date) return;

    const currentDate = new Date(date);
    const offset = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset);

    const newDateKey = newDate.toISOString().split('T')[0];
    router.replace(`/calendar/day/${newDateKey}`);
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
      {/* Header */}
      <CalendarDayHeader
        date={date}
        onBack={() => router.back()}
        onNavigateDay={navigateToAdjacentDay}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
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
                onMoveUp={() => form.handleMoveEntry(entry.id, 'up')}
                onMoveDown={() => form.handleMoveEntry(entry.id, 'down')}
                onEdit={() => form.handleEditEntry(entry)}
                onDelete={() => form.handleDeleteEntry(entry.id)}
                onViewOutfit={(outfitId) => router.push(`/outfits/${outfitId}/view`)}
                onStatusChange={(status) => form.handleStatusChange(entry.id, status)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => form.setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Entry</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Entry Modal */}
      <CalendarDayEntryForm
        visible={form.showAddModal}
        editingEntry={form.editingEntry}
        presets={presets}
        outfits={outfits}
        outfitImages={outfitImages}
        selectedPreset={form.selectedPreset}
        selectedOutfit={form.selectedOutfit}
        entryStatus={form.entryStatus}
        editNotes={form.editNotes}
        saving={form.saving}
        onClose={form.handleCloseModal}
        onSelectPreset={form.setSelectedPreset}
        onSelectOutfit={form.setSelectedOutfit}
        onStatusChange={form.setEntryStatus}
        onNotesChange={form.setEditNotes}
        onSubmit={form.editingEntry ? form.handleUpdateEntry : form.handleAddEntry}
        onCreatePreset={() => form.setShowCreatePresetModal(true)}
      />

      {/* Create Preset Modal */}
      <CreatePresetModal
        visible={form.showCreatePresetModal}
        presetName={form.newPresetName}
        onPresetNameChange={form.setNewPresetName}
        onCreate={() => form.handleCreatePreset(createPreset)}
        onClose={() => {
          form.setShowCreatePresetModal(false);
          form.setNewPresetName('');
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={form.showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          form.setShowDeleteConfirm(false);
          form.setEntryToDelete(null);
        }}
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
                  form.setShowDeleteConfirm(false);
                  form.setEntryToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={form.confirmDelete}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
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

/**
 * useCalendarDayForm Hook
 * Form state and handlers for calendar day entry form
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { CalendarEntry } from '@/lib/calendar';

interface UseCalendarDayFormProps {
  entries: CalendarEntry[];
  addEntry: (entry: {
    outfit_id?: string;
    slot_preset_id: string;
    status: 'planned' | 'worn' | 'skipped';
    notes?: string;
    sort_order: number;
  }) => Promise<{ error: any }>;
  updateEntry: (
    entryId: string,
    updates: Partial<{
      outfit_id: string | null;
      slot_preset_id: string | null;
      status: 'planned' | 'worn' | 'skipped';
      notes: string | null;
    }>
  ) => Promise<{ error: any }>;
  deleteEntry: (entryId: string) => Promise<{ error: any }>;
  reorderEntries: (fromIndex: number, toIndex: number) => Promise<void>;
}

interface UseCalendarDayFormReturn {
  // Form state
  showAddModal: boolean;
  editingEntry: CalendarEntry | null;
  selectedPreset: string | null;
  selectedOutfit: string | null;
  entryStatus: 'planned' | 'worn' | 'skipped';
  editNotes: string;
  saving: boolean;
  setShowAddModal: (show: boolean) => void;
  setSelectedPreset: (preset: string | null) => void;
  setSelectedOutfit: (outfit: string | null) => void;
  setEntryStatus: (status: 'planned' | 'worn' | 'skipped') => void;
  setEditNotes: (notes: string) => void;

  // Create preset modal
  showCreatePresetModal: boolean;
  newPresetName: string;
  setShowCreatePresetModal: (show: boolean) => void;
  setNewPresetName: (name: string) => void;

  // Delete confirmation
  showDeleteConfirm: boolean;
  entryToDelete: string | null;
  setShowDeleteConfirm: (show: boolean) => void;
  setEntryToDelete: (entryId: string | null) => void;

  // Handlers
  handleAddEntry: () => Promise<void>;
  handleEditEntry: (entry: CalendarEntry) => void;
  handleUpdateEntry: () => Promise<void>;
  handleDeleteEntry: (entryId: string) => void;
  confirmDelete: () => Promise<void>;
  handleMoveEntry: (entryId: string, direction: 'up' | 'down') => Promise<void>;
  handleStatusChange: (
    entryId: string,
    status: 'planned' | 'worn' | 'skipped'
  ) => Promise<void>;
  handleCreatePreset: (createPresetFn: (name: string) => Promise<{ data: any; error: any }>) => Promise<void>;
  resetForm: () => void;
  handleCloseModal: () => void;
}

export function useCalendarDayForm({
  entries,
  addEntry,
  updateEntry,
  deleteEntry,
  reorderEntries,
}: UseCalendarDayFormProps): UseCalendarDayFormReturn {
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

  const resetForm = useCallback(() => {
    setEditingEntry(null);
    setSelectedPreset(null);
    setSelectedOutfit(null);
    setEntryStatus('planned');
    setEditNotes('');
  }, []);

  const handleCloseModal = useCallback(() => {
    resetForm();
    setShowAddModal(false);
  }, [resetForm]);

  const handleAddEntry = useCallback(async () => {
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
  }, [selectedPreset, selectedOutfit, entryStatus, editNotes, entries.length, addEntry, resetForm]);

  const handleEditEntry = useCallback(
    (entry: CalendarEntry) => {
      setEditingEntry(entry);
      setSelectedPreset(entry.slot_preset_id || null);
      setSelectedOutfit(entry.outfit_id || null);
      setEntryStatus(entry.status);
      setEditNotes(entry.notes || '');
      setShowAddModal(true);
    },
    []
  );

  const handleUpdateEntry = useCallback(async () => {
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
  }, [editingEntry, selectedOutfit, selectedPreset, entryStatus, editNotes, updateEntry, resetForm]);

  const handleDeleteEntry = useCallback((entryId: string) => {
    setEntryToDelete(entryId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!entryToDelete) return;

    const { error } = await deleteEntry(entryToDelete);

    if (error) {
      Alert.alert('Error', 'Failed to delete entry');
    }

    setShowDeleteConfirm(false);
    setEntryToDelete(null);
  }, [entryToDelete, deleteEntry]);

  const handleMoveEntry = useCallback(
    async (entryId: string, direction: 'up' | 'down') => {
      const entryIndex = entries.findIndex((e) => e.id === entryId);
      if (entryIndex === -1) return;

      const newIndex = direction === 'up' ? entryIndex - 1 : entryIndex + 1;
      if (newIndex < 0 || newIndex >= entries.length) return;

      await reorderEntries(entryIndex, newIndex);
    },
    [entries, reorderEntries]
  );

  const handleStatusChange = useCallback(
    async (entryId: string, status: 'planned' | 'worn' | 'skipped') => {
      await updateEntry(entryId, { status });
    },
    [updateEntry]
  );

  const handleCreatePreset = useCallback(
    async (createPresetFn: (name: string) => Promise<{ data: any; error: any }>) => {
      if (!newPresetName.trim()) {
        Alert.alert('Error', 'Please enter a preset name');
        return;
      }

      const { error } = await createPresetFn(newPresetName.trim());

      if (error) {
        Alert.alert('Error', `Failed to create preset: ${error.message || error}`);
      } else {
        setNewPresetName('');
        setShowCreatePresetModal(false);
      }
    },
    [newPresetName]
  );

  return {
    // Form state
    showAddModal,
    editingEntry,
    selectedPreset,
    selectedOutfit,
    entryStatus,
    editNotes,
    saving,
    setShowAddModal,
    setSelectedPreset,
    setSelectedOutfit,
    setEntryStatus,
    setEditNotes,

    // Create preset modal
    showCreatePresetModal,
    newPresetName,
    setShowCreatePresetModal,
    setNewPresetName,

    // Delete confirmation
    showDeleteConfirm,
    entryToDelete,
    setShowDeleteConfirm,
    setEntryToDelete,

    // Handlers
    handleAddEntry,
    handleEditEntry,
    handleUpdateEntry,
    handleDeleteEntry,
    confirmDelete,
    handleMoveEntry,
    handleStatusChange,
    handleCreatePreset,
    resetForm,
    handleCloseModal,
  };
}

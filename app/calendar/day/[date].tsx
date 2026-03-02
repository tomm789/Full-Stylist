/**
 * Calendar Day Screen (Refactored)
 * View and manage calendar entries for a specific day
 *
 * Features:
 * - Smooth horizontal slide transitions between dates (no modal close/reopen)
 * - Swipe left/right to navigate days
 * - Inline add/edit entry form within the modal
 */

import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  useWindowDimensions,
  PanResponder,
  TextInput,
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
  CalendarDayHeader,
  SlotPresetSelector,
  OutfitGridPicker,
  StatusSelector,
  CreatePresetModal,
} from '@/components/calendar';
import { LoadingSpinner } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import type { CalendarEntry } from '@/lib/calendar';

const { spacing, borderRadius, typography } = theme;

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 0.15;
const SLIDE_DURATION = 250;

function getAdjacentDateKey(dateKey: string, direction: 'prev' | 'next'): string {
  const current = new Date(dateKey);
  current.setDate(current.getDate() + (direction === 'prev' ? -1 : 1));
  return current.toISOString().split('T')[0];
}

export default function CalendarDayScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = useWindowDimensions();
  const { date } = useLocalSearchParams<{ date: string | string[] }>();

  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const initialDateKey = Array.isArray(date) ? date[0] : date;

  // --- Internal date state (no router.replace for day navigation) ---
  const [currentDateKey, setCurrentDateKey] = useState<string | undefined>(initialDateKey);

  // --- Animation ---
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  // --- View mode: 'list' (entries) or 'form' (add/edit) ---
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);

  // --- Form state ---
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<'planned' | 'worn' | 'skipped'>('planned');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCreatePresetModal, setShowCreatePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // --- Data hooks ---
  const {
    entries,
    loading,
    refresh,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
  } = useDayEntries({ userId, date: currentDateKey });

  const { presets, createPreset } = useSlotPresets({ userId });
  const { outfits, outfitImages } = useUserOutfits({ userId });

  useFocusEffect(
    useCallback(() => {
      if (userId && currentDateKey) {
        refresh();
      }
    }, [userId, currentDateKey, refresh])
  );

  // --- Form helpers ---
  const resetForm = useCallback(() => {
    setEditingEntry(null);
    setSelectedPreset(null);
    setSelectedOutfit(null);
    setEntryStatus('planned');
    setEditNotes('');
  }, []);

  const openAddForm = useCallback(() => {
    resetForm();
    setViewMode('form');
  }, [resetForm]);

  const openEditForm = useCallback((entry: CalendarEntry) => {
    setEditingEntry(entry);
    setSelectedPreset(entry.slot_preset_id || null);
    setSelectedOutfit(entry.outfit_id || null);
    setEntryStatus(entry.status);
    setEditNotes(entry.notes || '');
    setViewMode('form');
  }, []);

  const handleCancelForm = useCallback(() => {
    resetForm();
    setViewMode('list');
  }, [resetForm]);

  const handleSaveEntry = useCallback(async () => {
    if (!currentDateKey) return;
    if (!selectedPreset) {
      Alert.alert('Missing slot', 'Please select a slot preset');
      return;
    }

    setSaving(true);

    if (editingEntry) {
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
        setViewMode('list');
      }
    } else {
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
        setViewMode('list');
      }
    }

    setSaving(false);
  }, [currentDateKey, selectedPreset, selectedOutfit, entryStatus, editNotes, editingEntry, entries.length, addEntry, updateEntry, resetForm]);

  const handleCreatePreset = useCallback(async () => {
    if (!newPresetName.trim()) {
      Alert.alert('Error', 'Please enter a preset name');
      return;
    }
    const { error } = await createPreset(newPresetName.trim());
    if (error) {
      Alert.alert('Error', `Failed to create preset: ${error.message || error}`);
      return;
    }
    setNewPresetName('');
    setShowCreatePresetModal(false);
  }, [newPresetName, createPreset]);

  // --- Animated day navigation ---
  const animateToDate = useCallback((direction: 'prev' | 'next') => {
    if (isAnimating.current || !currentDateKey) return;
    if (viewMode === 'form') return;

    isAnimating.current = true;
    const outTarget = direction === 'next' ? -screenWidth : screenWidth;

    Animated.timing(slideAnim, {
      toValue: outTarget,
      duration: SLIDE_DURATION / 2,
      useNativeDriver: true,
    }).start(() => {
      const newDateKey = getAdjacentDateKey(currentDateKey, direction);
      setCurrentDateKey(newDateKey);

      slideAnim.setValue(direction === 'next' ? screenWidth : -screenWidth);

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: SLIDE_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
      });
    });
  }, [currentDateKey, screenWidth, slideAnim, viewMode]);

  const navigateToAdjacentDay = useCallback((direction: 'prev' | 'next') => {
    animateToDate(direction);
  }, [animateToDate]);

  // --- Swipe gesture ---
  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (viewMode === 'form') return false;
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (viewMode === 'form') return;
        const { dx, vx } = gestureState;
        if (dx < -SWIPE_THRESHOLD || vx < -SWIPE_VELOCITY) {
          animateToDate('next');
        } else if (dx > SWIPE_THRESHOLD || vx > SWIPE_VELOCITY) {
          animateToDate('prev');
        }
      },
    }),
  [animateToDate, viewMode]);

  const handleBack = () => {
    if (viewMode === 'form') {
      handleCancelForm();
      return;
    }
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/calendar' as any);
    }
  };

  if (!currentDateKey) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary }}>Invalid date.</Text>
      </View>
    );
  }

  if (loading && entries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Loading day..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <CalendarDayHeader
        date={currentDateKey}
        onBack={handleBack}
        onNavigateDay={viewMode === 'list' ? navigateToAdjacentDay : () => {}}
      />

      {/* Form mode sub-header */}
      {viewMode === 'form' && (
        <View style={styles.formSubHeader}>
          <TouchableOpacity onPress={handleCancelForm} style={styles.formHeaderButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.formSubHeaderTitle}>
            {editingEntry ? 'Edit Entry' : 'New Entry'}
          </Text>
          <TouchableOpacity
            onPress={handleSaveEntry}
            style={styles.formHeaderButton}
            disabled={saving}
          >
            <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Animated content area */}
      <Animated.View
        style={[styles.animatedContent, { transform: [{ translateX: slideAnim }] }]}
        {...(viewMode === 'list' ? panResponder.panHandlers : {})}
      >
        {viewMode === 'list' ? (
          /* ---------- LIST MODE ---------- */
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
                    onMoveUp={() => {
                      if (index > 0) reorderEntries(index, index - 1);
                    }}
                    onMoveDown={() => {
                      if (index < entries.length - 1) reorderEntries(index, index + 1);
                    }}
                    onEdit={() => openEditForm(entry)}
                    onDelete={() => {
                      Alert.alert('Delete entry?', 'This cannot be undone.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry.id) },
                      ]);
                    }}
                    onViewOutfit={(outfitId) => router.push(`/outfits/${outfitId}/view`)}
                    onStatusChange={(status) => updateEntry(entry.id, { status })}
                  />
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
              <Text style={styles.addButtonText}>+ Add Entry</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* ---------- FORM MODE ---------- */
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <SlotPresetSelector
              presets={presets}
              selectedPresetId={selectedPreset}
              onSelectPreset={setSelectedPreset}
              onCreatePreset={() => setShowCreatePresetModal(true)}
            />

            <StatusSelector
              status={entryStatus}
              onStatusChange={setEntryStatus}
              disabled={saving}
            />

            <View style={styles.notesSection}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes about this entry"
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                blurOnSubmit={false}
                numberOfLines={3}
                editable={!saving}
              />
            </View>

            <OutfitGridPicker
              outfits={outfits}
              outfitImages={outfitImages}
              selectedOutfitId={selectedOutfit}
              onSelectOutfit={setSelectedOutfit}
            />
          </ScrollView>
        )}
      </Animated.View>

      <CreatePresetModal
        visible={showCreatePresetModal}
        presetName={newPresetName}
        onPresetNameChange={setNewPresetName}
        onCreate={handleCreatePreset}
        onClose={() => {
          setShowCreatePresetModal(false);
          setNewPresetName('');
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  animatedContent: {
    flex: 1,
    overflow: 'hidden',
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
    borderRadius: borderRadius.round,
    minHeight: spacing.huge + spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + spacing.xs / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl + spacing.lg,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Form sub-header
  formSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  formHeaderButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  formSubHeaderTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  cancelText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  saveText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  // Form fields
  notesSection: {
    marginBottom: spacing.lg + spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm + spacing.xs / 2,
    color: colors.textPrimary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + spacing.xs / 2,
    paddingTop: spacing.sm,
    fontSize: 16,
    backgroundColor: colors.backgroundSecondary,
    height: 80,
    textAlignVertical: 'top',
  },
});

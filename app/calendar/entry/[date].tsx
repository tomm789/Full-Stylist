/**
 * Calendar Entry Screen
 * Full-screen add/edit entry flow
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useDayEntries, useSlotPresets, useUserOutfits } from '@/hooks/calendar';
import {
  SlotPresetSelector,
  OutfitGridPicker,
  StatusSelector,
  CreatePresetModal,
} from '@/components/calendar';
import { LoadingSpinner } from '@/components/shared';
import { KeyboardAwareScreen } from '@/components/shared/layout';
import { showErrorToast } from '@/utils/toast';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import type { CalendarEntry } from '@/lib/calendar';

const { spacing, borderRadius, typography } = theme;

export default function CalendarEntryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { date, entryId } = useLocalSearchParams<{
    date: string | string[];
    entryId?: string | string[];
  }>();

  const dateKey = Array.isArray(date) ? date[0] : date;
  const entryIdKey = Array.isArray(entryId) ? entryId[0] : entryId;

  const { entries, loading: entriesLoading, addEntry, updateEntry } = useDayEntries({
    userId: user?.id,
    date: dateKey,
  });
  const { presets, loading: presetsLoading, createPreset } = useSlotPresets({ userId: user?.id });
  const { outfits, outfitImages, loading: outfitsLoading } = useUserOutfits({ userId: user?.id });

  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<'planned' | 'worn' | 'skipped'>('planned');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [showCreatePresetModal, setShowCreatePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const didInitRef = useRef(false);

  const dateLabel = useMemo(() => {
    if (!dateKey) return '';
    const dateValue = new Date(dateKey);
    return dateValue.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [dateKey]);

  useEffect(() => {
    if (!entryIdKey || didInitRef.current || entries.length === 0) return;
    const entry = entries.find((item) => item.id === entryIdKey);
    if (!entry) return;
    didInitRef.current = true;
    setEditingEntry(entry);
    setSelectedPreset(entry.slot_preset_id || null);
    setSelectedOutfit(entry.outfit_id || null);
    setEntryStatus(entry.status);
    setEditNotes(entry.notes || '');
  }, [entries, entryIdKey]);

  const goBack = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/calendar' as any);
    }
  };

  const handleSave = async () => {
    if (!dateKey) return;
    if (!selectedPreset) {
      showErrorToast('Please select a slot preset');
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
        showErrorToast('Failed to update entry');
      } else {
        goBack();
      }
      setSaving(false);
      return;
    }

    const { error } = await addEntry({
      outfit_id: selectedOutfit || undefined,
      slot_preset_id: selectedPreset,
      status: entryStatus,
      notes: editNotes.trim() || undefined,
      sort_order: entries.length,
    });

    if (error) {
      showErrorToast(error.message || 'Failed to create entry');
    } else {
      goBack();
    }

    setSaving(false);
  };

  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) {
      showErrorToast('Please enter a preset name');
      return;
    }

    const { error } = await createPreset(newPresetName.trim());
    if (error) {
      showErrorToast(`Failed to create preset: ${error.message || error}`);
      return;
    }

    setNewPresetName('');
    setShowCreatePresetModal(false);
  };

  if (!dateKey) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary }}>Invalid date.</Text>
      </View>
    );
  }

  if (entriesLoading || presetsLoading || outfitsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Loading entry..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.titleText}>
            {editingEntry ? 'Edit Entry' : 'Add Entry'}
          </Text>
          <Text style={styles.subtitleText}>{dateLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerSaveButton}
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel={editingEntry ? 'Update entry' : 'Save entry'}
        >
          <Text style={[styles.headerSaveText, saving && { opacity: 0.5 }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAwareScreen
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        dismissOnTap
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

        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
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
      </KeyboardAwareScreen>

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
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  headerSaveButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerSaveText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  subtitleText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + spacing.xs / 2,
    fontSize: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
});

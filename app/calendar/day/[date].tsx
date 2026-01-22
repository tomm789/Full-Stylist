import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCalendarEntriesForDate,
  getSlotPresets,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  createSlotPreset,
  CalendarEntry,
  CalendarSlotPreset,
} from '@/lib/calendar';
import { getUserOutfits } from '@/lib/outfits';
import { supabase } from '@/lib/supabase';

export default function CalendarDayScreen() {
  const { date, autoAdd } = useLocalSearchParams<{ date: string; autoAdd?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [slotPresets, setSlotPresets] = useState<CalendarSlotPreset[]>([]);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [outfitImages, setOutfitImages] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<'planned' | 'worn' | 'skipped'>('planned');
  const [saving, setSaving] = useState(false);
  const [showCreatePresetModal, setShowCreatePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    initialize();
  }, [user, date]);

  // Reload data when screen comes into focus (e.g., after deleting an outfit)
  useFocusEffect(
    React.useCallback(() => {
      if (user && date) {
        initialize();
      }
    }, [user, date])
  );

  const initialize = async () => {
    if (!user || !date) return;

    setLoading(true);

    // Load slot presets
    const { data: presets } = await getSlotPresets(user.id);
    if (presets) {
      setSlotPresets(presets);
    }

    // Load outfits
    const { data: userOutfits } = await getUserOutfits(user.id);
    if (userOutfits) {
      setOutfits(userOutfits);
      
      // Load outfit images for all user outfits
      const imagesMap = new Map<string, string | null>();
      for (const outfit of userOutfits) {
        if (outfit.cover_image_id) {
          const { data: coverImage } = await supabase
            .from('images')
            .select('storage_key, storage_bucket')
            .eq('id', outfit.cover_image_id)
            .single();
          
          if (coverImage?.storage_key) {
            const storageBucket = coverImage.storage_bucket || 'media';
            const { data: urlData } = supabase.storage
              .from(storageBucket)
              .getPublicUrl(coverImage.storage_key);
            
            if (urlData?.publicUrl) {
              imagesMap.set(outfit.id, urlData.publicUrl);
            }
          }
        }
      }
      setOutfitImages(imagesMap);
    }

    // Load entries for this date
    const { data: dayEntries } = await getCalendarEntriesForDate(user.id, date);
    if (dayEntries) {
      setEntries(dayEntries);
    }

    setLoading(false);
    
    // Auto-open add modal if autoAdd parameter is present
    if (autoAdd === 'true') {
      // Use setTimeout to ensure UI is ready
      setTimeout(() => {
        setShowAddModal(true);
      }, 100);
    }
  };

  const handleAddEntry = async () => {
    if (!user || !date) return;

    if (!selectedPreset) {
      Alert.alert('Error', 'Please select a slot preset');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await createCalendarEntry(user.id, date, {
        outfit_id: selectedOutfit || undefined,
        slot_preset_id: selectedPreset,
        status: entryStatus,
        sort_order: entries.length,
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to create entry');
      } else {
        // Reload entries
        const { data: dayEntries } = await getCalendarEntriesForDate(user.id, date);
        if (dayEntries) {
          setEntries(dayEntries);
        }

        // Reset form
        setSelectedPreset(null);
        setCustomLabel('');
        setSelectedOutfit(null);
        setEntryStatus('planned');
        setShowAddModal(false);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleEditEntry = (entry: CalendarEntry) => {
    setEditingEntry(entry);
    setSelectedPreset(entry.slot_preset_id || null);
    setCustomLabel(entry.custom_label || '');
    setSelectedOutfit(entry.outfit_id || null);
    setEntryStatus(entry.status);
    setEditNotes(entry.notes || '');
    setShowAddModal(true);
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;

    setSaving(true);

    try {
      const { error } = await updateCalendarEntry(editingEntry.id, {
        outfit_id: selectedOutfit || null,
        slot_preset_id: selectedPreset || null,
        status: entryStatus,
        notes: editNotes.trim() || null,
      });

      if (error) {
        Alert.alert('Error', 'Failed to update entry');
      } else {
        // Reload entries
        if (user && date) {
          const { data: dayEntries } = await getCalendarEntriesForDate(user.id, date);
          if (dayEntries) {
            setEntries(dayEntries);
          }
        }

        // Reset form
        setEditingEntry(null);
        setSelectedPreset(null);
        setCustomLabel('');
        setSelectedOutfit(null);
        setEntryStatus('planned');
        setEditNotes('');
        setShowAddModal(false);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update entry');
    } finally {
      setSaving(false);
    }
  };

  const handleViewOutfit = (outfitId: string) => {
    router.push(`/outfits/${outfitId}/view`);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
    setSelectedPreset(null);
    setCustomLabel('');
    setSelectedOutfit(null);
    setEntryStatus('planned');
    setEditNotes('');
  };

  const handleCreatePreset = async () => {
    if (!user || !newPresetName.trim()) {
      Alert.alert('Error', 'Please enter a preset name');
      return;
    }

    const { data: preset, error } = await createSlotPreset(user.id, newPresetName.trim());

    if (error) {
      Alert.alert('Error', `Failed to create preset: ${error.message || error}`);
    } else {
      // Reload presets
      const { data: presets } = await getSlotPresets(user.id);
      if (presets) {
        setSlotPresets(presets);
      }
      setNewPresetName('');
      setShowCreatePresetModal(false);
    }
  };

  const handleDragEnd = async (fromIndex: number, toIndex: number) => {
    if (!user || !date) return;
    if (fromIndex === toIndex) return;

    // Create new array with reordered entries
    const newEntries = [...entries];
    const [movedEntry] = newEntries.splice(fromIndex, 1);
    newEntries.splice(toIndex, 0, movedEntry);

    // Optimistically update UI
    setEntries(newEntries);

    // Update sort_order for all affected entries
    try {
      const updates = newEntries.map((entry, index) => ({
        id: entry.id,
        sort_order: index,
      }));

      // Update all entries in parallel
      const updatePromises = updates.map((update) =>
        updateCalendarEntry(update.id, { sort_order: update.sort_order })
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        // Rollback on error
        const { data: dayEntries } = await getCalendarEntriesForDate(user.id, date);
        if (dayEntries) {
          setEntries(dayEntries);
        }
        Alert.alert('Error', 'Failed to reorder entries');
      }
    } catch (error: any) {
      // Rollback on error
      const { data: dayEntries } = await getCalendarEntriesForDate(user.id, date);
      if (dayEntries) {
        setEntries(dayEntries);
      }
      Alert.alert('Error', 'Failed to reorder entries');
    }
  };

  const handleMoveEntry = async (entryId: string, direction: 'up' | 'down') => {
    if (!user || !date) return;

    const entryIndex = entries.findIndex((e) => e.id === entryId);
    if (entryIndex === -1) return;

    const newIndex = direction === 'up' ? entryIndex - 1 : entryIndex + 1;
    if (newIndex < 0 || newIndex >= entries.length) return;

    await handleDragEnd(entryIndex, newIndex);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDelete(entryId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    
    const { error } = await deleteCalendarEntry(entryToDelete);
    
    if (error) {
      Alert.alert('Error', 'Failed to delete entry');
    } else {
      setEntries(entries.filter((e) => e.id !== entryToDelete));
    }
    
    setShowDeleteConfirm(false);
    setEntryToDelete(null);
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

  const navigateToAdjacentDay = (direction: 'prev' | 'next') => {
    if (!date) return;
    
    const currentDate = new Date(date);
    const offset = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset);
    
    const newDateKey = newDate.toISOString().split('T')[0];
    // Use replace instead of push to avoid stacking navigation history
    router.replace(`/calendar/day/${newDateKey}`);
  };

  const getPresetName = (entry: CalendarEntry): string => {
    if (entry.slot_preset_id) {
      const preset = slotPresets.find((p) => p.id === entry.slot_preset_id);
      return preset?.name || 'Unknown';
    }
    return entry.custom_label || 'Custom';
  };

  const getOutfitTitle = (entry: CalendarEntry): string | null => {
    if (entry.outfit_id) {
      const outfit = outfits.find((o) => o.id === entry.outfit_id);
      return outfit?.title || null;
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <View style={styles.navigationRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
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
              <View
                key={entry.id}
                style={[
                  styles.entryCard,
                  draggingIndex === index && styles.entryCardDragging,
                  dragTargetIndex === index && draggingIndex !== index && styles.entryCardDragTarget,
                ]}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryHeaderLeft}>
                    <View style={styles.reorderButtons}>
                      <TouchableOpacity
                        onPress={() => handleMoveEntry(entry.id, 'up')}
                        disabled={index === 0}
                        style={styles.reorderButton}
                      >
                        <Text style={[styles.reorderButtonText, index === 0 && styles.reorderButtonDisabled]}>
                          ↑
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveEntry(entry.id, 'down')}
                        disabled={index === entries.length - 1}
                        style={styles.reorderButton}
                      >
                        <Text
                          style={[
                            styles.reorderButtonText,
                            index === entries.length - 1 && styles.reorderButtonDisabled,
                          ]}
                        >
                          ↓
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.entryPreset}>{getPresetName(entry)}</Text>
                  </View>
                  <View style={styles.entryActions}>
                    <TouchableOpacity
                      onPress={() => handleEditEntry(entry)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.editButton}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteEntry(entry.id)}
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
                      onPress={() => handleViewOutfit(entry.outfit_id!)}
                      activeOpacity={0.7}
                    >
                      {outfitImages.get(entry.outfit_id) ? (
                        <ExpoImage
                          source={{ uri: outfitImages.get(entry.outfit_id)! }}
                          style={styles.outfitImage}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={styles.outfitImagePlaceholder}>
                          <Text style={styles.placeholderText}>No Image</Text>
                        </View>
                      )}
                      <View style={styles.outfitInfo}>
                        {/* Status Badge Above Title */}
                        <Text
                          style={[
                            styles.statusBadgeInline,
                            entry.status === 'worn' && styles.statusWorn,
                            entry.status === 'skipped' && styles.statusSkipped,
                          ]}
                        >
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </Text>
                        <Text style={styles.outfitTitle}>
                          {getOutfitTitle(entry) || 'Unknown Outfit'}
                        </Text>
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
                        onPress={async () => {
                          const { error } = await updateCalendarEntry(entry.id, {
                            status: entry.status === 'worn' ? 'planned' : 'worn',
                          });
                          if (!error && user && date) {
                            const { data: dayEntries } = await getCalendarEntriesForDate(user.id, date);
                            if (dayEntries) setEntries(dayEntries);
                          }
                        }}
                      >
                        <Text style={[
                          styles.statusActionText,
                          entry.status === 'worn' && styles.statusActionTextActive,
                        ]}>
                          ✓ Worn
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.statusActionButton,
                          entry.status === 'skipped' && styles.statusActionButtonActive,
                        ]}
                        onPress={async () => {
                          const { error } = await updateCalendarEntry(entry.id, {
                            status: entry.status === 'skipped' ? 'planned' : 'skipped',
                          });
                          if (!error && user && date) {
                            const { data: dayEntries } = await getCalendarEntriesForDate(user.id, date);
                            if (dayEntries) setEntries(dayEntries);
                          }
                        }}
                      >
                        <Text style={[
                          styles.statusActionText,
                          entry.status === 'skipped' && styles.statusActionTextActive,
                        ]}>
                          × Skipped
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {entry.notes && (
                  <Text style={styles.entryNotes}>{entry.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
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
              <View style={styles.section}>
                <Text style={styles.label}>Slot Preset</Text>
                <View style={styles.presetsList}>
                  {slotPresets.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={[
                        styles.presetOption,
                        selectedPreset === preset.id && styles.presetOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedPreset(preset.id);
                        setCustomLabel('');
                      }}
                    >
                      <Text
                        style={[
                          styles.presetText,
                          selectedPreset === preset.id && styles.presetTextSelected,
                        ]}
                      >
                        {preset.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity 
                  style={styles.createPresetButtonContainer}
                  onPress={() => setShowCreatePresetModal(true)}
                >
                  <Text style={styles.createPresetButton}>+ Create Custom Slot</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Outfit</Text>
                {outfits.length === 0 ? (
                  <Text style={styles.emptyText}>No outfits available</Text>
                ) : (
                  <FlatList
                    data={outfits}
                    keyExtractor={(item) => item.id}
                    numColumns={3}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.outfitGridCard,
                          selectedOutfit === item.id && styles.outfitGridCardSelected,
                        ]}
                        onPress={() =>
                          setSelectedOutfit(selectedOutfit === item.id ? null : item.id)
                        }
                      >
                        {outfitImages.get(item.id) ? (
                          <ExpoImage
                            source={{ uri: outfitImages.get(item.id)! }}
                            style={styles.outfitGridImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.outfitGridImagePlaceholder}>
                            <Text style={styles.outfitGridPlaceholderText}>No Image</Text>
                          </View>
                        )}
                        {selectedOutfit === item.id && (
                          <View style={styles.outfitSelectedOverlay}>
                            <Text style={styles.outfitSelectedCheck}>✓</Text>
                          </View>
                        )}
                        <Text
                          style={styles.outfitGridTitle}
                          numberOfLines={1}
                        >
                          {item.title || 'Untitled Outfit'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    scrollEnabled={false}
                    columnWrapperStyle={styles.outfitGridRow}
                  />
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusGroup}>
                  {(['planned', 'worn', 'skipped'] as const).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        entryStatus === status && styles.statusOptionSelected,
                      ]}
                      onPress={() => setEntryStatus(status)}
                      disabled={saving}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          entryStatus === status && styles.statusTextSelected,
                        ]}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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

              <TouchableOpacity
                style={[styles.submitButton, saving && styles.buttonDisabled]}
                onPress={editingEntry ? handleUpdateEntry : handleAddEntry}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editingEntry ? 'Update Entry' : 'Add Entry'}
                  </Text>
                )}
              </TouchableOpacity>
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
              <TextInput
                style={styles.input}
                placeholder="e.g. Gym, Date Night, Casual"
                value={newPresetName}
                onChangeText={setNewPresetName}
                maxLength={50}
              />
              <TouchableOpacity
                style={[styles.submitButton, !newPresetName.trim() && styles.buttonDisabled]}
                onPress={handleCreatePreset}
                disabled={!newPresetName.trim()}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    color: '#007AFF',
    fontWeight: '600',
  },
  dayNavigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNavButtonText: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  entriesList: {
    gap: 12,
    marginBottom: 24,
  },
  entryCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 14,
    color: '#007AFF',
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
    color: '#007AFF',
    fontWeight: 'bold',
    lineHeight: 16,
  },
  reorderButtonDisabled: {
    color: '#ccc',
  },
  entryPreset: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  entryCardDragging: {
    opacity: 0.5,
    backgroundColor: '#e7f3ff',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  entryCardDragTarget: {
    backgroundColor: '#f0f0f0',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  deleteButton: {
    fontSize: 24,
    color: '#ff3b30',
    fontWeight: 'bold',
  },
  outfitSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  outfitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 12,
  },
  outfitImage: {
    width: 140,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  outfitImagePlaceholder: {
    width: 140,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
  },
  outfitInfo: {
    flex: 1,
    paddingTop: 4,
  },
  statusBadgeInline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  outfitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  tapToView: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statusActionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statusActionButtonActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  statusActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  statusActionTextActive: {
    color: '#fff',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  statusWorn: {
    backgroundColor: '#4caf50',
    color: '#fff',
  },
  statusSkipped: {
    backgroundColor: '#ff9800',
    color: '#fff',
  },
  entryNotes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  presetsList: {
    gap: 8,
  },
  presetOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  presetOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
  },
  presetText: {
    fontSize: 14,
    color: '#666',
  },
  presetTextSelected: {
    color: '#000',
    fontWeight: '600',
  },
  outfitGridRow: {
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  outfitGridCard: {
    flex: 1,
    maxWidth: '31%',
    margin: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  outfitGridCardSelected: {
    borderColor: '#000',
    borderWidth: 3,
  },
  outfitGridImage: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: '#f0f0f0',
  },
  outfitGridImagePlaceholder: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitGridPlaceholderText: {
    fontSize: 10,
    color: '#999',
  },
  outfitSelectedOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitSelectedCheck: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  outfitGridTitle: {
    padding: 8,
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
  },
  statusGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statusOptionSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  statusTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  createPresetButtonContainer: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  createPresetButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  confirmDeleteButton: {
    backgroundColor: '#ff3b30',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
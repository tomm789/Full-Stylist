/**
 * Outfit View Screen (Refactored)
 * View outfit details with social engagement
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useOutfitView, useSocialEngagement, useOutfitViewActions } from '@/hooks/outfits';
import { useCalendarDayForm, useSlotPresets } from '@/hooks/calendar';
import {
  OutfitViewContent,
  OutfitNavigation,
} from '@/components/outfits';
import {
  Header,
  LoadingSpinner,
  LoadingOverlay,
} from '@/components/shared';
import {
  CalendarDatePickerModal,
  CalendarDayEntryForm,
  CreatePresetModal,
} from '@/components/calendar';
import {
  DropdownMenuModal,
  DropdownMenuItem,
  dropdownMenuStyles,
} from '@/components/shared/modals';
import { theme, commonStyles } from '@/styles';
import { PERF_MODE } from '@/lib/perf/perfMode';
import {
  CalendarEntry,
  createCalendarEntry,
  getCalendarEntriesForDate,
} from '@/lib/calendar';

const { colors } = theme;

export default function OutfitViewScreen() {
  const {
    id,
    outfitIds,
    filters,
    returnTo,
    renderJobId: renderJobIdParam,
    renderTraceId: renderTraceIdParam,
  } = useLocalSearchParams<{
    id: string;
    outfitIds?: string;
    filters?: string;
    returnTo?: string;
    renderJobId?: string;
    renderTraceId?: string;
  }>();
  const router = useRouter();
  const { user } = useAuth();

  // Outfit data
  const {
    outfit,
    coverImage,
    coverImageDataUri,
    outfitItems,
    wardrobeItems,
    itemImageUrls,
    loading,
    isGenerating,
    renderTraceId,
    jobSucceededAt,
    lastSucceededJobId,
    lastSucceededJobFeedbackAt,
    refreshOutfit,
    deleteOutfit: deleteOutfitAction,
  } = useOutfitView({
    outfitId: id,
    userId: user?.id,
    renderJobIdParam: renderJobIdParam as string | undefined,
    renderTraceIdParam: renderTraceIdParam as string | undefined,
  });

  // Social engagement (defer fetch until after cover load in PERF_MODE)
  const {
    liked,
    likeCount,
    saved,
    saveCount,
    commentCount,
    comments,
    loadingComments,
    toggleLike,
    toggleSave,
    loadComments,
    submitComment,
    triggerLoadEngagement,
  } = useSocialEngagement('outfit', id, user?.id, PERF_MODE ? { deferInitialFetch: true } : undefined);

  // PERF_MODE: fallback trigger engagement after delay if image never loads (triggerLoadEngagement is single-fire inside hook)
  const DEFERRED_ENGAGEMENT_FALLBACK_MS = 4000;
  useEffect(() => {
    if (!PERF_MODE || !triggerLoadEngagement) return;
    const t = setTimeout(() => {
      triggerLoadEngagement();
    }, DEFERRED_ENGAGEMENT_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [PERF_MODE, triggerLoadEngagement]);

  // Show feedback UI whenever we have a generation job; compact (bottom-right thumbs) after feedback given
  const [feedbackSubmittedForJobId, setFeedbackSubmittedForJobId] = useState<string | null>(null);
  const showFeedbackOverlay = !!(coverImageDataUri && lastSucceededJobId);
  const feedbackGiven =
    !!lastSucceededJobFeedbackAt || feedbackSubmittedForJobId === lastSucceededJobId;

  // Actions
  const actions = useOutfitViewActions({
    outfitId: id,
    outfitIds,
    filters,
    returnTo,
    outfit,
    deleteOutfit: deleteOutfitAction,
  });

  const [showMenu, setShowMenu] = useState(false);
  const isOwnOutfit = outfit?.owner_user_id === user?.id;
  const closeMenu = () => setShowMenu(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [entriesForDate, setEntriesForDate] = useState<CalendarEntry[]>([]);
  const [loadingEntriesForDate, setLoadingEntriesForDate] = useState(false);

  const { presets, createPreset } = useSlotPresets({ userId: user?.id });

  const loadEntriesForDate = useCallback(async (dateKey: string) => {
    if (!user?.id) return;
    setLoadingEntriesForDate(true);
    const { data, error } = await getCalendarEntriesForDate(user.id, dateKey);
    if (error) {
      console.error('Failed to load calendar entries for date', error);
    }
    setEntriesForDate(data || []);
    setLoadingEntriesForDate(false);
  }, [user?.id]);

  const addEntry = useCallback(async (entry: {
    outfit_id?: string;
    slot_preset_id: string;
    status: 'planned' | 'worn' | 'skipped';
    notes?: string;
    sort_order: number;
  }) => {
    if (!user?.id || !selectedDateKey) {
      return { error: new Error('Missing date or user') };
    }
    return createCalendarEntry(user.id, selectedDateKey, entry);
  }, [selectedDateKey, user?.id]);

  const form = useCalendarDayForm({
    entries: entriesForDate,
    addEntry,
    updateEntry: async () => ({ error: null }),
    deleteEntry: async () => ({ error: null }),
    reorderEntries: async () => {},
  });

  const handleDateSelect = useCallback(async (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    setSelectedDateKey(dateKey);
    setShowDatePickerModal(false);
    await loadEntriesForDate(dateKey);
    form.resetForm();
    form.setSelectedOutfit(id);
    form.setShowAddModal(true);
  }, [form, id, loadEntriesForDate]);

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LoadingSpinner text="Loading outfit..." />
      </View>
    );
  }

  if (!outfit) {
    return (
      <View style={commonStyles.container}>
        <Text style={styles.errorText}>Outfit not found</Text>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <LoadingOverlay visible={isGenerating} message="Generating outfit..." />

      {/* Header */}
      <Header
        leftContent={
          <TouchableOpacity onPress={actions.handleBackPress}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        }
        rightContent={
          isOwnOutfit ? (
            <>
              <TouchableOpacity onPress={() => setShowDatePickerModal(true)}>
                <Ionicons name="calendar-outline" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={actions.toggleFavorite}>
                <Ionicons
                  name={outfit?.is_favorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={outfit?.is_favorite ? colors.error : colors.textPrimary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowMenu(true)}>
                <Ionicons name="ellipsis-vertical" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          ) : null
        }
      />

      <DropdownMenuModal
        visible={showMenu}
        onClose={closeMenu}
        topOffset={100}
        align="right"
      >
        <DropdownMenuItem
          label="Edit"
          icon="pencil-outline"
          onPress={() => {
            closeMenu();
            actions.handleEdit();
          }}
        />
        <View style={dropdownMenuStyles.menuDivider} />
        <DropdownMenuItem
          label="Delete"
          icon="trash-outline"
          onPress={() => {
            closeMenu();
            actions.handleDelete();
          }}
          danger
        />
      </DropdownMenuModal>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <OutfitViewContent
          outfit={outfit}
          coverImage={coverImage}
          coverImageDataUri={coverImageDataUri}
          outfitItems={outfitItems}
          wardrobeItems={wardrobeItems}
          itemImageUrls={itemImageUrls}
          liked={liked}
          likeCount={likeCount}
          saved={saved}
          saveCount={saveCount}
          commentCount={commentCount}
          comments={comments}
          showComments={actions.showComments}
          showImageModal={actions.showImageModal}
          onLike={toggleLike}
          onSave={toggleSave}
          onComment={() => actions.handleCommentPress(comments, loadComments)}
          onSubmitComment={submitComment}
          onImageModalClose={() => actions.setShowImageModal(false)}
          onImagePress={() => actions.setShowImageModal(true)}
          renderTraceId={renderTraceId ?? undefined}
          jobSucceededAt={jobSucceededAt ?? undefined}
          onCoverImageLoad={PERF_MODE && triggerLoadEngagement ? triggerLoadEngagement : undefined}
          onCoverImageErrorAfterRetries={PERF_MODE && triggerLoadEngagement ? triggerLoadEngagement : undefined}
          showFeedbackOverlay={showFeedbackOverlay}
          feedbackCompact={feedbackGiven}
          feedbackJobId={lastSucceededJobId ?? undefined}
          feedbackJobType="outfit_render"
          onFeedbackSubmitted={(jobId) => setFeedbackSubmittedForJobId(jobId)}
        />
      </ScrollView>

      {/* Navigation Bar */}
      <OutfitNavigation
        outfits={actions.navigationOutfits}
        currentOutfitId={id}
        onNavigate={actions.navigateToOutfit}
      />

      <CalendarDatePickerModal
        visible={showDatePickerModal}
        onClose={() => setShowDatePickerModal(false)}
        onSelectDate={handleDateSelect}
      />

      <CalendarDayEntryForm
        visible={form.showAddModal}
        editingEntry={null}
        presets={presets}
        outfits={[]}
        outfitImages={new Map()}
        showOutfitPicker={false}
        selectedPreset={form.selectedPreset}
        selectedOutfit={form.selectedOutfit}
        entryStatus={form.entryStatus}
        editNotes={form.editNotes}
        saving={form.saving || loadingEntriesForDate}
        onClose={form.handleCloseModal}
        onSelectPreset={form.setSelectedPreset}
        onSelectOutfit={form.setSelectedOutfit}
        onStatusChange={form.setEntryStatus}
        onNotesChange={form.setEditNotes}
        onSubmit={form.handleAddEntry}
        onCreatePreset={() => form.setShowCreatePresetModal(true)}
      />

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
        visible={actions.showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => actions.setShowDeleteConfirm(false)}
      >
        <View style={styles.deleteModalContainer}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Outfit</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this outfit?
            </Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => actions.setShowDeleteConfirm(false)}
                disabled={actions.deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={actions.confirmDelete}
                disabled={actions.deleting}
              >
                {actions.deleting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  deleteModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
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

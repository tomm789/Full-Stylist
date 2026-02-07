/**
 * AIGenerationFeedback – floating overlay for rating AI-generated content
 * Glassmorphism style over generated images; thumbs up/down with optional tags and comment.
 * When compact, shows only thumbs in bottom-right corner (after feedback already given).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitAIFeedback, FEEDBACK_TAGS, type FeedbackTag } from '@/lib/ai-feedback';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const FEEDBACK_TAG_VALUES = FEEDBACK_TAGS as readonly string[];

interface AIGenerationFeedbackProps {
  jobId: string;
  jobType: string;
  /** Called when feedback is submitted; receives the jobId so parent can avoid stale closure. */
  onClose: (jobId: string) => void;
  /** When true, show only thumbs in bottom-right corner (feedback already given). */
  compact?: boolean;
}

const glass = {
  backgroundColor: 'rgba(255, 255, 255, 0.25)',
  borderWidth: 1,
  borderColor: 'rgba(0, 0, 0, 0.12)',
  ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' as const } : {}),
};

const glassDark = {
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderWidth: 1,
  borderColor: 'rgba(0, 0, 0, 0.2)',
  ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' as const } : {}),
};

export function AIGenerationFeedback({
  jobId,
  jobType,
  onClose,
  compact = false,
}: AIGenerationFeedbackProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [submitting, setSubmitting] = useState(false);
  const [showThumbsDownModal, setShowThumbsDownModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<FeedbackTag>>(new Set());
  const [comment, setComment] = useState('');

  const toggleTag = (tag: FeedbackTag) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const handleThumbsUp = async () => {
    setSubmitting(true);
    const { error } = await submitAIFeedback({
      jobId,
      jobType,
      rating: 1,
    });
    setSubmitting(false);
    if (!error) onClose(jobId);
  };

  const handleThumbsDownSubmit = async () => {
    setSubmitting(true);
    const { error } = await submitAIFeedback({
      jobId,
      jobType,
      rating: -1,
      tags: Array.from(selectedTags),
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (!error) {
      setShowThumbsDownModal(false);
      onClose(jobId);
    }
  };

  const thumbIconColor = colors.textPrimary;
  const thumbSize = compact ? 22 : 28;

  if (compact) {
    return (
      <>
        <View style={[styles.compactContainer, styles.pointerEventsBoxNone]}>
          <View style={[styles.compactButtons, glassDark]}>
            <TouchableOpacity
              style={styles.compactThumb}
              onPress={handleThumbsUp}
              disabled={submitting}
            >
              <Ionicons name="thumbs-up" size={thumbSize} color={thumbIconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactThumb}
              onPress={() => setShowThumbsDownModal(true)}
              disabled={submitting}
            >
              <Ionicons name="thumbs-down" size={thumbSize} color={thumbIconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={[styles.overlay, glass, styles.pointerEventsBoxNone]}>
        <Text style={styles.prompt}>How does this look?</Text>
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.thumbButton, glass]}
            onPress={handleThumbsUp}
            disabled={submitting}
          >
            <Ionicons name="thumbs-up" size={thumbSize} color={thumbIconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.thumbButton, glass]}
            onPress={() => setShowThumbsDownModal(true)}
            disabled={submitting}
          >
            <Ionicons name="thumbs-down" size={thumbSize} color={thumbIconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showThumbsDownModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThumbsDownModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowThumbsDownModal(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>What could be better?</Text>
            <Text style={styles.modalSubtitle}>Select one or more (optional)</Text>
            <View style={styles.tagsRow}>
              {FEEDBACK_TAG_VALUES.map((tag) => {
                const isSelected = selectedTags.has(tag as FeedbackTag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagChip,
                      isSelected && styles.tagChipSelected,
                    ]}
                    onPress={() => toggleTag(tag as FeedbackTag)}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && styles.tagChipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment (optional)"
              placeholderTextColor={colors.textPlaceholder}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowThumbsDownModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleThumbsDownSubmit}
                disabled={submitting}
              >
                <Text style={styles.submitButtonText}>
                  {submitting ? 'Sending…' : 'Send feedback'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    margin: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 20,
  },
  thumbButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 10,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  pointerEventsBoxNone: {
    pointerEvents: 'box-none',
  },
  compactButtons: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 4,
  },
  compactThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayLight,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  tagChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.backgroundTertiary,
  },
  tagChipSelected: {
    backgroundColor: colors.gray300,
  },
  tagChipText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  commentInput: {
    minHeight: 80,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.backgroundTertiary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

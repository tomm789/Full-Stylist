/**
 * CommentSection Component
 * Section for displaying and submitting comments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Comment } from '@/lib/engagement';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface CommentSectionProps {
  comments: Comment[];
  onSubmit: (text: string) => Promise<boolean>;
}

export default function CommentSection({
  comments,
  onSubmit,
}: CommentSectionProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!commentText.trim() || submitting) return;

    setSubmitting(true);
    const success = await onSubmit(commentText);
    if (success) {
      setCommentText('');
    }
    setSubmitting(false);
  };

  return (
    <View style={styles.container}>
      {/* Comment Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          value={commentText}
          onChangeText={setCommentText}
          editable={!submitting}
          multiline
          placeholderTextColor={colors.textPlaceholder}
        />
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!commentText.trim() || submitting}
          style={[
            styles.submitButton,
            (!commentText.trim() || submitting) && styles.submitButtonDisabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      {comments.map((comment) => (
        <View key={comment.id} style={styles.commentItem}>
          <Text style={styles.commentAuthor}>
            {comment.user?.display_name || comment.user?.handle || 'User'}
          </Text>
          <Text style={styles.commentBody}>{comment.body}</Text>
          <Text style={styles.commentDate}>
            {new Date(comment.created_at).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs / 2,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs / 2,
    fontSize: typography.fontSize.sm,
    maxHeight: 100,
    color: colors.textPrimary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + spacing.xs / 2,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray300,
  },
  submitText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  commentItem: {
    marginBottom: spacing.sm + spacing.xs / 2,
  },
  commentAuthor: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    color: colors.textPrimary,
  },
  commentBody: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
    lineHeight: 20,
  },
  commentDate: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
});

/**
 * SocialActionBar Component
 * Action bar with like, comment, and save buttons
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';

const { colors, spacing } = theme;

interface SocialActionBarProps {
  liked: boolean;
  likeCount: number;
  saved: boolean;
  saveCount: number;
  commentCount: number;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
}

export default function SocialActionBar({
  liked,
  likeCount,
  saved,
  saveCount,
  commentCount,
  onLike,
  onComment,
  onSave,
}: SocialActionBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onLike} style={styles.actionButton}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={28}
            color={liked ? colors.error : colors.textPrimary}
          />
          {likeCount > 0 && <Text style={styles.actionCount}>{likeCount}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onComment} style={styles.actionButton}>
          <Ionicons
            name="chatbubble-outline"
            size={26}
            color={colors.textPrimary}
          />
          {commentCount > 0 && (
            <Text style={styles.actionCount}>{commentCount}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onSave} style={styles.actionButton}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={saved ? colors.primary : colors.textPrimary}
          />
          {saveCount > 0 && <Text style={styles.actionCount}>{saveCount}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs / 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg + spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 2,
  },
  actionCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

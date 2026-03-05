/**
 * SocialActionBar Component
 * Like, comment, repost, save, and find similar buttons
 */

import React, { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EngagementCounts } from '@/hooks/engagement';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, typography } = theme;

interface SocialActionBarProps {
  counts: EngagementCounts;
  onLike: () => void;
  onComment: () => void;
  onRepost: () => void;
  onSave: () => void;
  onFindSimilar?: () => void;
  liking?: boolean;
  saving?: boolean;
  reposting?: boolean;
}

export default function SocialActionBar({
  counts,
  onLike,
  onComment,
  onRepost,
  onSave,
  onFindSimilar,
  liking = false,
  saving = false,
  reposting = false,
}: SocialActionBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.actionRow}>
      {/* Like */}
      <TouchableOpacity style={styles.actionButton} onPress={onLike} disabled={liking}>
        {liking ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={counts.hasLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={counts.hasLiked ? colors.favorite : colors.textPrimary}
          />
        )}
        {counts.likes > 0 && <Text style={styles.actionCount}>{counts.likes}</Text>}
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity style={styles.actionButton} onPress={onComment}>
        <Ionicons name="chatbubble-outline" size={26} color={colors.textPrimary} />
        {counts.comments > 0 && (
          <Text style={styles.actionCount}>{counts.comments}</Text>
        )}
      </TouchableOpacity>

      {/* Repost */}
      <TouchableOpacity style={styles.actionButton} onPress={onRepost} disabled={reposting}>
        {reposting ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={counts.hasReposted ? 'repeat' : 'repeat-outline'}
            size={28}
            color={counts.hasReposted ? colors.repost : colors.textPrimary}
          />
        )}
        {counts.reposts > 0 && <Text style={styles.actionCount}>{counts.reposts}</Text>}
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity style={styles.actionButton} onPress={onSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons
            name={counts.hasSaved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={counts.hasSaved ? colors.primary : colors.textPrimary}
          />
        )}
        {counts.saves > 0 && <Text style={styles.actionCount}>{counts.saves}</Text>}
      </TouchableOpacity>

      {/* Find Similar (optional) */}
      {onFindSimilar && (
        <TouchableOpacity style={styles.actionButton} onPress={onFindSimilar}>
          <Ionicons name="search-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg + spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + spacing.xs / 4,
  },
  actionCount: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.semibold,
  },
});

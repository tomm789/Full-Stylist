/**
 * SocialActionBar Component
 * Like, comment, repost, save, and find similar buttons
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EngagementCounts } from '@/hooks/social';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

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
  const styles = createStyles(colors);
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
            color={counts.hasLiked ? '#ff0000' : colors.textPrimary}
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
            color={counts.hasReposted ? '#00ba7c' : colors.textPrimary}
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
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

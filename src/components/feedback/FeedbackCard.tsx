/**
 * FeedbackCard Component
 * Display feedback thread in list
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackThread } from '@/lib/feedback';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

const getCategoryColor = (category: string, colors: ThemeColors): string => {
  switch (category) {
    case 'bug':
      return colors.error;
    case 'feature':
      return colors.primary;
    case 'general':
      return colors.success;
    case 'other':
      return colors.systemGray;
    default:
      return colors.systemGray;
  }
};

const getStatusColor = (status: string, colors: ThemeColors): string => {
  switch (status) {
    case 'open':
      return colors.primary;
    case 'in_progress':
      return colors.warning;
    case 'resolved':
      return colors.success;
    case 'closed':
      return colors.systemGray;
    default:
      return colors.systemGray;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
};

const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const posted = new Date(timestamp);
  const diffMs = now.getTime() - posted.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (posted.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return posted.toLocaleDateString('en-US', options);
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semibold,
  },
  body: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.normal,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    flex: 1,
  },
  author: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  commentCount: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
});

interface FeedbackCardProps {
  thread: FeedbackThread;
  onPress: () => void;
}

export function FeedbackCard({ thread, onPress }: FeedbackCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryColor = getCategoryColor(thread.category, colors);
  const statusColor = getStatusColor(thread.status, colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {thread.title}
          </Text>
          <View style={styles.badges}>
            <View
              style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}
            >
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {thread.category.charAt(0).toUpperCase() + thread.category.slice(1)}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(thread.status)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.body} numberOfLines={3}>
        {thread.body}
      </Text>

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.author}>
            {thread.user?.display_name || thread.user?.handle || 'User'}
          </Text>
          <Text style={styles.time}>{formatTimestamp(thread.created_at)}</Text>
        </View>
        <View style={styles.stats}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.commentCount}>{thread.comment_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

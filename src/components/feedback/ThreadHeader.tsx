/**
 * ThreadHeader Component
 * Header section for feedback thread
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
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

interface ThreadHeaderProps {
  thread: FeedbackThread;
  isOwner: boolean;
  onStatusChange: (status: 'open' | 'in_progress' | 'resolved' | 'closed') => void;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  threadHeader: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  threadBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  threadTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
    color: colors.textPrimary,
  },
  threadBody: {
    fontSize: typography.fontSize.base,
    color: colors.gray800,
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  threadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadAuthor: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  threadTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
  },
  statusChanger: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statusLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  statusButtonActive: {
    borderWidth: 0,
  },
  statusButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: colors.white,
  },
});

export function ThreadHeader({
  thread,
  isOwner,
  onStatusChange,
}: ThreadHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryColor = getCategoryColor(thread.category, colors);
  const statusColor = getStatusColor(thread.status, colors);

  return (
    <View style={styles.threadHeader}>
      <View style={styles.threadBadges}>
        <View
          style={[
            styles.badge,
            { backgroundColor: categoryColor + '20' },
          ]}
        >
          <Text
            style={[styles.badgeText, { color: categoryColor }]}
          >
            {thread.category}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: statusColor + '20' },
          ]}
        >
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {thread.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.threadTitle}>{thread.title}</Text>
      <Text style={styles.threadBody}>{thread.body}</Text>

      <View style={styles.threadMeta}>
        <Text style={styles.threadAuthor}>
          {thread.user?.display_name || thread.user?.handle || 'Unknown'}
        </Text>
        <Text style={styles.threadTime}>
          {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
        </Text>
      </View>

      {/* Status Changer (Owner Only) */}
      {isOwner && (
        <View style={styles.statusChanger}>
          <Text style={styles.statusLabel}>Change Status:</Text>
          <View style={styles.statusButtons}>
            {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => {
              const btnColor = getStatusColor(status, colors);
              return (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusButton,
                    thread.status === status && styles.statusButtonActive,
                    {
                      borderColor: btnColor,
                      backgroundColor:
                        thread.status === status ? btnColor : colors.transparent,
                    },
                  ]}
                  onPress={() => onStatusChange(status)}
                >
                  <Text
                    style={[
                      styles.statusButtonText,
                      thread.status === status && styles.statusButtonTextActive,
                      {
                        color: thread.status === status ? colors.white : btnColor,
                      },
                    ]}
                  >
                    {status.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

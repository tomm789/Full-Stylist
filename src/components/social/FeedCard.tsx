/**
 * FeedCard Component
 * Renders a single feed item with outfit/lookbook and social actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedItem } from '@/lib/posts';
import { EngagementCounts } from '@/hooks/social';
import { theme } from '@/styles';

const { colors, spacing, typography } = theme;

interface FeedCardProps {
  item: FeedItem;
  counts: EngagementCounts;
  currentUserId: string | undefined;
  onUserPress: (userId: string) => void;
  onMenuPress: () => void;
  children: React.ReactNode; // Content (outfit/lookbook)
  actions: React.ReactNode; // Social action buttons
  caption?: string;
}

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

export default function FeedCard({
  item,
  counts,
  currentUserId,
  onUserPress,
  onMenuPress,
  children,
  actions,
  caption,
}: FeedCardProps) {
  const post = item.type === 'post' ? item.post : item.repost?.original_post;
  if (!post) return null;

  const timestamp = item.type === 'post' ? item.post!.created_at : item.repost!.created_at;
  const isOwnPost = item.type === 'post' && post.owner_user_id === currentUserId;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {item.type === 'repost' && (
            <Text style={styles.repostLabel}>
              <TouchableOpacity
                onPress={() => item.owner?.id && onUserPress(item.owner.id)}
              >
                <Text style={styles.repostLabelName}>
                  {item.owner?.display_name || item.owner?.handle || 'User'}
                </Text>
              </TouchableOpacity>
              {' reposted'}
            </Text>
          )}
          {item.type === 'post' && item.owner && (
            <TouchableOpacity onPress={() => onUserPress(item.owner.id)}>
              <Text style={styles.ownerName}>
                {item.owner?.display_name || item.owner?.handle || 'User'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
          <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {children}

      {/* Caption */}
      {caption && <Text style={styles.caption}>{caption}</Text>}

      {/* Social Actions */}
      <View style={styles.socialActions}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 0,
    marginBottom: 0,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    paddingVertical: spacing.sm + spacing.xs / 4,
    marginBottom: 0,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  repostLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  repostLabelName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  menuButton: {
    padding: spacing.xs / 2,
    marginLeft: spacing.sm,
  },
  caption: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm + spacing.xs / 2,
    paddingTop: spacing.xs / 2,
    paddingBottom: spacing.sm,
  },
  socialActions: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs / 2,
    borderBottomWidth: 0,
  },
});

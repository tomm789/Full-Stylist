/**
 * FeedCard Component
 * Renders a single feed item with outfit/lookbook and social actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FeedItem } from '@/lib/posts';
import { theme } from '@/styles';
import { formatTimestamp } from '@/utils/formatUtils';

const { colors, spacing, typography } = theme;

interface FeedCardProps {
  item: FeedItem;
  onUserPress?: (userId: string) => void;
  onMenuPress?: () => void;
  children: React.ReactNode; // Content (outfit/lookbook)
  actions: React.ReactNode; // Social action buttons
  caption?: string;
}

export default function FeedCard({
  item,
  onUserPress,
  onMenuPress,
  children,
  actions,
  caption,
}: FeedCardProps) {
  const post = item.type === 'post' ? item.post : item.repost?.original_post;
  if (!post) return null;

  const timestamp = item.type === 'post' ? item.post!.created_at : item.repost!.created_at;
  const canOpenProfile = Boolean(onUserPress);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {item.owner?.avatar_url ? (
            <ExpoImage
              source={{ uri: item.owner.avatar_url }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.avatarFallback} />
          )}
          {item.type === 'repost' && (
            <Text style={styles.repostLabel}>
              {canOpenProfile ? (
                <TouchableOpacity
                  onPress={() => item.owner?.id && onUserPress?.(item.owner.id)}
                >
                  <Text style={styles.repostLabelName}>
                    {item.owner?.display_name || item.owner?.handle || 'User'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.repostLabelName}>
                  {item.owner?.display_name || item.owner?.handle || 'User'}
                </Text>
              )}
              {' reposted'}
            </Text>
          )}
          {item.type === 'post' && item.owner && (
            canOpenProfile ? (
              <TouchableOpacity onPress={() => onUserPress?.(item.owner.id)}>
                <Text style={styles.ownerName}>
                  {item.owner?.display_name || item.owner?.handle || 'User'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.ownerName}>
                {item.owner?.display_name || item.owner?.handle || 'User'}
              </Text>
            )
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
          {onMenuPress ? (
            <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
  },
  avatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
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

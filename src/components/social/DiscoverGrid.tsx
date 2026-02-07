/**
 * DiscoverGrid Component
 * 3-column grid view for the Discover tab on the social feed
 * Shows public posts from all users (same grid layout as ProfileTabs)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FeedItem } from '@/lib/posts';
import { spacing, typography } from '@/styles';
import PostGrid, { postGridStyles } from './PostGrid';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';


interface DiscoverGridProps {
  feed: FeedItem[];
  images: Map<string, string | null>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  onItemPress?: (item: FeedItem) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (outfitId: string, imageUrl?: string | null) => void;
  onItemLongPress?: (item: FeedItem) => void;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  scrollEnabled?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  showOwnerOverlay?: boolean;
}

export function DiscoverGrid({
  feed,
  images,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  hasMore,
  onItemPress,
  selectionMode = false,
  selectedIds,
  onToggleSelection,
  onItemLongPress,
  onScroll,
  scrollEventThrottle,
  scrollEnabled = true,
  emptyTitle = 'No public posts yet',
  emptyMessage = 'Check back later for new content from the community',
  emptyIcon = 'globe-outline',
  showOwnerOverlay = true,
}: DiscoverGridProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const router = useRouter();

  const handlePostPress = (item: FeedItem) => {
    if (onItemPress) {
      onItemPress(item);
      return;
    }

    const post = item.post;
    if (!post) return;

    if (post.owner_user_id) {
      router.push(`/users/${post.owner_user_id}/feed?postId=${post.id}`);
      return;
    }

    if (post.entity_type === 'outfit') {
      router.push(`/outfits/${post.entity_id}/view`);
    } else if (post.entity_type === 'lookbook') {
      router.push(`/lookbooks/${post.entity_id}`);
    }
  };

  const handleOwnerPress = (item: FeedItem) => {
    const ownerId = item.post?.owner_user_id;
    if (ownerId) {
      router.push(`/users/${ownerId}`);
    }
  };

  const renderGridItem = ({ item }: { item: FeedItem }) => {
    const entity = item.entity?.outfit || item.entity?.lookbook;
    if (!entity) return null;

    const imageUrl = images.get(entity.id);
    const isOutfit = item.post?.entity_type === 'outfit';
    const isSelected = Boolean(isOutfit && selectedIds?.has(entity.id));

    const handlePress = () => {
      if (selectionMode && isOutfit && onToggleSelection) {
        onToggleSelection(entity.id, imageUrl || null);
        return;
      }
      handlePostPress(item);
    };

    const handleLongPress = () => {
      if (!isOutfit || !onItemLongPress) return;
      onItemLongPress(item);
    };

    return (
      <TouchableOpacity
        style={postGridStyles.gridItem}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={postGridStyles.gridImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={postGridStyles.gridImagePlaceholder}>
            <Ionicons
              name={item.post?.entity_type === 'lookbook' ? 'albums-outline' : 'shirt-outline'}
              size={28}
              color={colors.textTertiary}
            />
          </View>
        )}
        {isSelected && (
          <View style={postGridStyles.selectionBadge}>
            <Text style={postGridStyles.selectionBadgeText}>✓</Text>
          </View>
        )}
        {showOwnerOverlay && (
          <TouchableOpacity
            style={postGridStyles.infoOverlay}
            onPress={() => handleOwnerPress(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.ownerHandle} numberOfLines={1}>
              @{item.owner?.handle || 'unknown'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && feed.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <PostGrid
      data={feed}
      renderItem={renderGridItem}
      keyExtractor={(item) => item.id}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      scrollEnabled={scrollEnabled}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name={emptyIcon} size={48} color={colors.gray400} />
          <Text style={styles.emptyText}>{emptyTitle}</Text>
          <Text style={styles.emptySubtext}>{emptyMessage}</Text>
        </View>
      }
      ListFooterComponent={
        hasMore && feed.length > 0 ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  ownerHandle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray800,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  loadMoreContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});

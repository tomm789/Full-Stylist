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
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FeedItem } from '@/lib/posts';
import { colors, spacing, borderRadius, typography, layout } from '@/styles';

interface DiscoverGridProps {
  feed: FeedItem[];
  images: Map<string, string | null>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
}

export function DiscoverGrid({
  feed,
  images,
  loading,
  refreshing,
  onRefresh,
  onLoadMore,
  hasMore,
}: DiscoverGridProps) {
  const router = useRouter();

  const handlePostPress = (item: FeedItem) => {
    const post = item.post;
    if (!post) return;

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

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handlePostPress(item)}
        activeOpacity={0.8}
      >
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.gridImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            <Ionicons
              name={item.post?.entity_type === 'lookbook' ? 'albums-outline' : 'shirt-outline'}
              size={28}
              color={colors.textTertiary}
            />
          </View>
        )}
        {/* Owner handle overlay */}
        <TouchableOpacity
          style={styles.ownerOverlay}
          onPress={() => handleOwnerPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.ownerHandle} numberOfLines={1}>
            @{item.owner?.handle || 'unknown'}
          </Text>
        </TouchableOpacity>
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
    <FlatList
      data={feed}
      renderItem={renderGridItem}
      keyExtractor={(item) => item.id}
      numColumns={3}
      style={styles.gridList}
      contentContainerStyle={styles.gridContent}
      columnWrapperStyle={styles.gridRow}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="globe-outline" size={48} color={colors.gray400} />
          <Text style={styles.emptyText}>No public posts yet</Text>
          <Text style={styles.emptySubtext}>
            Check back later for new content from the community
          </Text>
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

const styles = StyleSheet.create({
  gridList: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: layout.containerMaxWidth,
  },
  gridContent: {
    paddingBottom: spacing.lg,
  },
  gridRow: {
    gap: 1,
  },
  gridItem: {
    flex: 1,
    aspectRatio: 3 / 4,
    margin: 0.5,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundTertiary,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
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

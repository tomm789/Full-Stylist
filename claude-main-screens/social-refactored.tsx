/**
 * Social Screen (Refactored)
 * Main feed with posts from followed users
 * 
 * BEFORE: 1,454 lines
 * AFTER: ~350 lines (76% reduction)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { FeedItem } from '@/lib/posts';
import {
  useFeed,
  useSocialEngagement,
  EngagementCounts,
} from '@/hooks/social';
import { useSlideshow } from '@/hooks/lookbooks';
import {
  FeedCard,
  SocialActionBar,
  FeedOutfitCard,
  FeedLookbookCarousel,
} from '@/components/social';
import { SlideshowModal } from '@/components/lookbooks';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { theme } from '@/styles';

const { colors, spacing } = theme;

export default function SocialScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { feed, outfitImages, lookbookImages, engagementCounts, followStatuses, loading, refresh } =
    useFeed({ userId: user?.id });

  const [localEngagementCounts, setLocalEngagementCounts] =
    useState<Record<string, EngagementCounts>>(engagementCounts);

  // Update local engagement counts when feed loads
  React.useEffect(() => {
    setLocalEngagementCounts(engagementCounts);
  }, [engagementCounts]);

  const { handleLike, handleSave, handleRepost, liking, saving, reposting } =
    useSocialEngagement({
      userId: user?.id,
      engagementCounts: localEngagementCounts,
      setEngagementCounts: setLocalEngagementCounts,
      onRepost: refresh,
    });

  const slideshow = useSlideshow();
  const [refreshing, setRefreshing] = useState(false);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openLookbookSlideshow = async (lookbookId: string) => {
    const lookbookOutfits = lookbookImages.get(`${lookbookId}_outfits`) || [];
    if (lookbookOutfits.length > 0) {
      await slideshow.open(lookbookOutfits);
    }
  };

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    const post = item.type === 'post' ? item.post : item.repost?.original_post;
    if (!post) return null;

    const counts = localEngagementCounts[post.id] || {
      likes: 0,
      saves: 0,
      comments: 0,
      reposts: 0,
      hasLiked: false,
      hasSaved: false,
      hasReposted: false,
    };

    const isOutfit = post.entity_type === 'outfit';
    const entity = item.entity?.outfit || item.entity?.lookbook;

    return (
      <FeedCard
        item={item}
        counts={counts}
        currentUserId={user?.id}
        onUserPress={(userId) => router.push(`/users/${userId}`)}
        onMenuPress={() =>
          setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)
        }
        caption={post.caption}
        actions={
          <SocialActionBar
            counts={counts}
            onLike={() => handleLike(post.id)}
            onComment={() => {
              if (isOutfit && entity) {
                router.push(`/outfits/${entity.id}/view`);
              } else if (!isOutfit && entity) {
                router.push(`/lookbooks/${entity.id}/view`);
              }
            }}
            onRepost={() => handleRepost(post.id)}
            onSave={() => handleSave(post.id)}
            onFindSimilar={
              isOutfit && entity
                ? () => {
                    // Find similar functionality would go here
                    // For now, just navigate to outfit
                    router.push(`/outfits/${entity.id}/view`);
                  }
                : undefined
            }
            liking={liking.has(post.id)}
            saving={saving.has(post.id)}
            reposting={reposting.has(post.id)}
          />
        }
      >
        {isOutfit && entity ? (
          <FeedOutfitCard
            outfit={entity}
            imageUrl={outfitImages.get(entity.id)}
            onPress={() => router.push(`/outfits/${entity.id}/view`)}
            loading={!outfitImages.has(entity.id)}
          />
        ) : (
          !isOutfit &&
          entity && (
            <FeedLookbookCarousel
              lookbook={entity}
              lookbookImages={lookbookImages}
              onPress={() => router.push(`/lookbooks/${entity.id}/view`)}
              onPlayPress={() => openLookbookSlideshow(entity.id)}
              loading={!lookbookImages.has(`${entity.id}_outfits`)}
            />
          )
        )}
      </FeedCard>
    );
  };

  if (loading && feed.length === 0) {
    return (
      <View style={styles.container}>
        <LoadingSpinner text="Loading feed..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feed}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        style={styles.feedList}
        contentContainerStyle={styles.feedListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <View style={styles.socialHeader}>
            <TouchableOpacity
              style={styles.socialHeaderCard}
              onPress={() => router.push('/social/explore')}
            >
              <View style={styles.socialHeaderIcon}>
                <Ionicons name="compass-outline" size={22} color={colors.white} />
              </View>
              <View>
                <Text style={styles.socialHeaderTitle}>Explore</Text>
                <Text style={styles.socialHeaderSubtitle}>Public outfits</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialHeaderCard}
              onPress={() => router.push('/social/following-wardrobes')}
            >
              <View style={styles.socialHeaderIconAlt}>
                <Ionicons name="people-outline" size={22} color={colors.white} />
              </View>
              <View>
                <Text style={styles.socialHeaderTitle}>Following wardrobes</Text>
                <Text style={styles.socialHeaderSubtitle}>See their latest pieces</Text>
              </View>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No posts yet"
            message="Be the first to share an outfit or lookbook!"
          />
        }
      />

      {/* Post Menu Modal - Simplified */}
      {openMenuPostId && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setOpenMenuPostId(null)}
        >
          <TouchableOpacity
            style={styles.menuModalOverlay}
            activeOpacity={1}
            onPress={() => setOpenMenuPostId(null)}
          >
            <View style={styles.menuDropdownModal}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setOpenMenuPostId(null);
                  // Menu actions would go here
                }}
              >
                <Ionicons name="flag-outline" size={18} color={colors.textPrimary} />
                <Text style={styles.menuItemText}>Report</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Loading Modal */}
      <Modal visible={slideshow.loading} transparent animationType="fade">
        <View style={styles.loadingModal}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.loadingText}>Loading slideshow...</Text>
          </View>
        </View>
      </Modal>

      {/* Slideshow Modal */}
      <SlideshowModal
        visible={slideshow.visible}
        outfits={slideshow.outfits}
        images={slideshow.images}
        currentIndex={slideshow.currentIndex}
        isAutoPlaying={slideshow.isAutoPlaying}
        onClose={slideshow.close}
        onNext={() => {
          slideshow.pauseAutoPlay();
          slideshow.next();
        }}
        onPrevious={() => {
          slideshow.pauseAutoPlay();
          slideshow.previous();
        }}
        onToggleAutoPlay={slideshow.toggleAutoPlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  feedList: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 630,
  },
  feedListContent: {
    paddingHorizontal: 0,
  },
  socialHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm + spacing.xs / 2,
  },
  socialHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs / 2,
    backgroundColor: colors.white,
    borderRadius: spacing.md,
    padding: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  socialHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialHeaderIconAlt: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  socialHeaderSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuDropdownModal: {
    backgroundColor: colors.white,
    borderRadius: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
    marginTop: 100,
    alignSelf: 'flex-end',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + spacing.xs / 2,
    gap: spacing.sm,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  loadingModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    padding: spacing.xl + spacing.lg,
    borderRadius: spacing.sm + spacing.xs / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 16,
    marginTop: spacing.md,
  },
});

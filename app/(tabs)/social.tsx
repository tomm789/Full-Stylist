/**
 * Social Feed Screen
 * Main social feed with Following + Discover tabs
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import FindSimilarModal from '@/components/FindSimilarModal';
import {
  CommentsModal,
  SlideshowModal,
  GeneratingOutfitModal,
  PostMenuModal,
  FeedItemComponent,
  DiscoverGrid,
} from '@/components/social';
import {
  useFeed,
  useDiscoverFeed,
  useEngagementActions,
  useFeedSlideshow,
  useTryOnOutfit,
  useSocialModals,
} from '@/hooks/social';
import { colors, spacing, borderRadius, typography, layout } from '@/styles';

type SocialTab = 'following' | 'discover';

export default function SocialScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SocialTab>('following');

  // Feed data and engagement (Following tab)
  const {
    feed,
    outfitImages,
    lookbookImages,
    engagementCounts: feedEngagementCounts,
    followStatuses: feedFollowStatuses,
    loading,
    refresh: refreshFeed,
  } = useFeed({ userId: user?.id });

  // Discover feed (Discover tab)
  const {
    discoverFeed,
    discoverImages,
    loading: discoverLoading,
    refresh: refreshDiscover,
    loadMore: loadMoreDiscover,
    hasMore: discoverHasMore,
  } = useDiscoverFeed({ userId: user?.id });

  const {
    engagementCounts,
    setEngagementCounts,
    handleLike,
    handleSave,
    handleRepost,
    updateCommentCount,
  } = useEngagementActions(user?.id);

  const {
    slideshowVisible,
    slideshowLoading,
    slideshowOutfits,
    slideshowImages,
    currentSlideIndex,
    isAutoPlaying,
    openSlideshow,
    closeSlideshow,
    handleManualNavigation,
    toggleAutoPlay,
  } = useFeedSlideshow(user?.id);

  // Try-on outfit
  const { tryingOnOutfit, generatingOutfitId, tryOnOutfit } = useTryOnOutfit({
    userId: user?.id,
  });

  // Modals
  const modals = useSocialModals({ refreshFeed });

  // Sync feed engagement counts
  React.useEffect(() => {
    setEngagementCounts(feedEngagementCounts);
  }, [feedEngagementCounts, setEngagementCounts]);

  // Sync follow statuses
  React.useEffect(() => {
    modals.setFollowStatuses(feedFollowStatuses);
  }, [feedFollowStatuses, modals]);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [discoverRefreshing, setDiscoverRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFeed();
    setRefreshing(false);
  };

  const onDiscoverRefresh = async () => {
    setDiscoverRefreshing(true);
    await refreshDiscover();
    setDiscoverRefreshing(false);
  };

  const handleRepostWithRefresh = async (postId: string) => {
    await handleRepost(postId, refreshFeed);
  };

  const renderFeedItem = ({ item }: { item: typeof feed[0] }) => {
    return (
      <FeedItemComponent
        item={item}
        engagementCounts={engagementCounts}
        outfitImages={outfitImages}
        lookbookImages={lookbookImages}
        currentUserId={user?.id}
        onLike={handleLike}
        onComment={modals.openComments}
        onRepost={handleRepostWithRefresh}
        onSave={handleSave}
        onFindSimilar={modals.handleFindSimilar}
        onMenuPress={(postId, position) => {
          modals.setMenuButtonPosition(position);
          modals.setOpenMenuPostId(modals.openMenuPostId === postId ? null : postId);
        }}
        onOpenSlideshow={openSlideshow}
        menuButtonRefs={modals.menuButtonRefs}
        menuButtonPositions={modals.menuButtonPositions}
        openMenuPostId={modals.openMenuPostId}
        setMenuButtonPosition={modals.setMenuButtonPosition}
        setOpenMenuPostId={modals.setOpenMenuPostId}
      />
    );
  };

  // Tab bar component
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'following' && styles.tabActive]}
        onPress={() => setActiveTab('following')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
          Following
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
        onPress={() => setActiveTab('discover')}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
          Discover
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Loading state (only for Following tab initial load)
  if (loading && feed.length === 0 && activeTab === 'following') {
    return (
      <View style={styles.container}>
        {renderTabBar()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTabBar()}

      {activeTab === 'following' ? (
        // Following tab - original feed list
        <FlatList
          ref={flatListRef}
          data={feed}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          style={styles.feedListWrapper}
          contentContainerStyle={styles.feedList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>
                Follow people to see their posts, or check out Discover!
              </Text>
            </View>
          }
        />
      ) : (
        // Discover tab - 3-column grid
        <DiscoverGrid
          feed={discoverFeed}
          images={discoverImages}
          loading={discoverLoading}
          refreshing={discoverRefreshing}
          onRefresh={onDiscoverRefresh}
          onLoadMore={loadMoreDiscover}
          hasMore={discoverHasMore}
        />
      )}

      {/* Post Menu Modal */}
      <PostMenuModal
        visible={modals.openMenuPostId !== null}
        feedItem={
          feed.find(
            (item) =>
              (item.type === 'post' && item.post?.id === modals.openMenuPostId) ||
              (item.type === 'repost' &&
                item.repost?.original_post?.id === modals.openMenuPostId)
          ) || null
        }
        currentUserId={user?.id}
        isFollowingOwner={
          modals.openMenuPostId
            ? modals.followStatuses.get(
                feed.find(
                  (item) =>
                    (item.type === 'post' &&
                      item.post?.id === modals.openMenuPostId) ||
                    (item.type === 'repost' &&
                      item.repost?.original_post?.id === modals.openMenuPostId)
                )?.type === 'post'
                  ? feed.find(
                      (item) =>
                        item.type === 'post' && item.post?.id === modals.openMenuPostId
                    )?.post?.owner_user_id || ''
                  : feed.find(
                      (item) =>
                        item.type === 'repost' &&
                        item.repost?.original_post?.id === modals.openMenuPostId
                    )?.repost?.original_post?.owner_user_id || ''
              ) || false
            : false
        }
        buttonPosition={modals.menuButtonPosition}
        tryingOnOutfit={tryingOnOutfit}
        unfollowingUserId={modals.unfollowingUserId}
        onClose={() => {
          modals.setOpenMenuPostId(null);
          modals.setMenuButtonPosition(null);
        }}
        onEditOutfit={modals.handleEditOutfit}
        onDeletePost={modals.handleDeletePost}
        onTryOnOutfit={tryOnOutfit}
        onUnfollow={modals.handleUnfollow}
        getImageUrl={(outfitId) => outfitImages.get(outfitId) || null}
      />

      {/* Comments Modal */}
      <CommentsModal
        visible={modals.showComments}
        onClose={() => modals.setShowComments(false)}
        postId={
          modals.selectedItem?.type === 'post'
            ? modals.selectedItem.post?.id || null
            : modals.selectedItem?.repost?.original_post?.id || null
        }
        userId={user?.id}
        comments={modals.comments}
        onCommentsUpdate={modals.setComments}
        onCountUpdate={(count) => {
          const postId =
            modals.selectedItem?.type === 'post'
              ? modals.selectedItem.post?.id
              : modals.selectedItem?.repost?.original_post?.id;
          if (postId) {
            updateCommentCount(postId, count);
          }
        }}
      />

      {/* Find Similar Modal */}
      <FindSimilarModal
        visible={modals.showFindSimilar}
        onClose={() => modals.setShowFindSimilar(false)}
        entityType={modals.findSimilarEntityType}
        entityId={modals.findSimilarEntityId}
        categoryId={modals.findSimilarCategoryId}
      />

      {/* Loading Modal */}
      <Modal visible={slideshowLoading} transparent animationType="fade">
        <View style={styles.loadingModalContainer}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color={colors.textLight} />
            <Text style={styles.loadingModalText}>Loading slideshow...</Text>
          </View>
        </View>
      </Modal>

      {/* Slideshow Modal */}
      <SlideshowModal
        visible={slideshowVisible}
        outfits={slideshowOutfits}
        images={slideshowImages}
        currentIndex={currentSlideIndex}
        isAutoPlaying={isAutoPlaying}
        onClose={closeSlideshow}
        onNext={() => handleManualNavigation('next')}
        onPrevious={() => handleManualNavigation('prev')}
        onToggleAutoPlay={toggleAutoPlay}
      />

      {/* Generating Outfit Overlay */}
      <GeneratingOutfitModal
        visible={generatingOutfitId !== null}
        outfitId={generatingOutfitId}
        onViewOutfit={(outfitId) => {
          router.push(`/outfits/${outfitId}/view`);
        }}
        onDismiss={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedListWrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: layout.containerMaxWidth,
  },
  feedList: {
    paddingHorizontal: 0,
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
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  loadingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    padding: spacing.xxxl,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
  },
  loadingModalText: {
    color: colors.textLight,
    fontSize: typography.fontSize.base,
    marginTop: spacing.lg,
  },
});

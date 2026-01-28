/**
 * Social Feed Screen (Refactored)
 * Main social feed with posts, engagement, and interactions
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
} from '@/components/social';
import {
  useFeed,
  useEngagementActions,
  useFeedSlideshow,
  useTryOnOutfit,
  useSocialModals,
} from '@/hooks/social';

export default function SocialScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Feed data and engagement
  const {
    feed,
    outfitImages,
    lookbookImages,
    engagementCounts: feedEngagementCounts,
    followStatuses: feedFollowStatuses,
    loading,
    refresh: refreshFeed,
  } = useFeed({ userId: user?.id });

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
  const flatListRef = useRef<FlatList>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFeed();
    setRefreshing(false);
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

  if (loading && feed.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
              Be the first to share an outfit or lookbook!
            </Text>
          </View>
        }
      />

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
            <ActivityIndicator size="large" color="#fff" />
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
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedListWrapper: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 630,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  loadingModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    padding: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    alignItems: 'center',
  },
  loadingModalText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
});

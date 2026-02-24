/**
 * User Feed Screen
 * View a specific user's posts in a single-column feed.
 * Supports three-dots menu, try-on, comments, and find-similar.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useFeed, useSocialEngagement, useSocialModals, useTryOnOutfit, useFeedSlideshow } from '@/hooks/social';
import { useApplyLook } from '@/hooks/headshot/useApplyLook';
import { FeedItemComponent } from '@/components/social/FeedItem';
import { PostMenuModal, CommentsModal, SlideshowModal } from '@/components/social';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { theme } from '@/styles';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

export default function UserFeedScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const { user } = useAuth();
  const router = useRouter();
  const { id: userId, postId } = useLocalSearchParams<{ id: string; postId?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const feedRef = useRef<FlatList>(null);
  const lastScrolledPostId = useRef<string | null>(null);
  const scrollAttemptRef = useRef(0);
  const MAX_SCROLL_ATTEMPTS = 6;

  // Load feed filtered by user
  const {
    feed,
    outfitImages,
    lookbookImages,
    headshotImages,
    engagementCounts,
    setEngagementCounts,
    followStatuses,
    loading,
    refresh,
  } = useFeed({
    userId: user?.id,
    filterByUserId: userId,
  });

  const { applyLook } = useApplyLook();

  // Social engagement (like, save, repost)
  const { handleLike, handleSave, handleRepost } = useSocialEngagement({
    userId: user?.id,
    engagementCounts,
    setEngagementCounts,
    onRepost: refresh,
  });

  // Modal state: menu, comments, find-similar, follow/unfollow
  const modals = useSocialModals({ refreshFeed: refresh });

  // Try-on feature
  const { tryOnOutfit, tryingOnOutfit } = useTryOnOutfit({ userId: user?.id });

  // Slideshow for lookbooks (accepts lookbook ID, matching FeedItemComponent's onOpenSlideshow signature)
  const {
    slideshowVisible,
    slideshowOutfits,
    slideshowImages,
    currentSlideIndex,
    isAutoPlaying,
    openSlideshow,
    closeSlideshow,
    handleManualNavigation,
    toggleAutoPlay,
  } = useFeedSlideshow(user?.id);

  // Sync follow statuses into modal state
  useEffect(() => {
    modals.setFollowStatuses(followStatuses);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followStatuses]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const getPostId = (item: any) => {
    const post = item.type === 'post' ? item.post : item.repost?.original_post;
    return post?.id ?? null;
  };

  const renderFeedItem = ({ item }: { item: any }) => (
    <FeedItemComponent
      item={item}
      engagementCounts={engagementCounts}
      outfitImages={outfitImages}
      lookbookImages={lookbookImages}
      headshotImages={headshotImages}
      currentUserId={user?.id}
      onLike={handleLike}
      onComment={modals.openComments}
      onRepost={handleRepost}
      onSave={handleSave}
      onFindSimilar={modals.handleFindSimilar}
      onTryOnOutfitShortcut={tryOnOutfit}
      onApplyLook={applyLook}
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

  const handleScrollToIndexFailed = (info: {
    index: number;
    averageItemLength: number;
  }) => {
    const offset = Math.max(0, info.averageItemLength * info.index);
    feedRef.current?.scrollToOffset({ offset, animated: false });
  };

  const handleFeedLayout = () => {
    if (!postId) return;
    if (feed.length === 0) return;
    if (!feedRef.current) return;

    const index = feed.findIndex((item) => getPostId(item) === postId);
    if (index < 0) return;

    feedRef.current?.scrollToIndex({
      index,
      viewPosition: 0,
      animated: false,
    });
  };

  useEffect(() => {
    if (!postId) return;
    if (feed.length === 0) return;
    if (lastScrolledPostId.current === postId) return;

    const index = feed.findIndex((item) => getPostId(item) === postId);
    if (index < 0) {
      if (scrollAttemptRef.current < MAX_SCROLL_ATTEMPTS) {
        scrollAttemptRef.current += 1;
        setTimeout(() => {
          lastScrolledPostId.current = null;
        }, 80);
      }
      return;
    }

    if (!feedRef.current) {
      if (scrollAttemptRef.current < MAX_SCROLL_ATTEMPTS) {
        scrollAttemptRef.current += 1;
        setTimeout(() => {
          lastScrolledPostId.current = null;
        }, 80);
      }
      return;
    }

    requestAnimationFrame(() => {
      feedRef.current?.scrollToIndex({
        index,
        viewPosition: 0,
        animated: false,
      });
    });

    lastScrolledPostId.current = postId;
    scrollAttemptRef.current = 0;
  }, [postId, feed]);

  // Resolve the open menu's post ID and owner ID for PostMenuModal
  const openMenuItem = modals.openMenuPostId
    ? feed.find((item) => getPostId(item) === modals.openMenuPostId) ?? null
    : null;
  const openMenuOwnerId = openMenuItem
    ? (openMenuItem.type === 'post'
        ? openMenuItem.post?.owner_user_id
        : openMenuItem.repost?.original_post?.owner_user_id) ?? null
    : null;

  // Resolve the open comments post ID for CommentsModal
  const commentsPostId = modals.selectedItem ? getPostId(modals.selectedItem) : null;

  if (loading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="User Feed"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
      />
      {feed.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="No posts yet"
          message="This user hasn't shared any outfits or lookbooks"
        />
      ) : (
        <FlatList
          ref={feedRef}
          data={feed}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feed}
          onLayout={handleFeedLayout}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

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

      {/* Three-dots post menu */}
      <PostMenuModal
        visible={modals.openMenuPostId !== null}
        feedItem={openMenuItem}
        currentUserId={user?.id}
        isFollowingOwner={openMenuOwnerId ? modals.followStatuses.get(openMenuOwnerId) === true : false}
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
        onApplyLook={applyLook}
        onUnfollow={modals.handleUnfollow}
        getImageUrl={(outfitId) => outfitImages.get(outfitId) ?? null}
      />

      {/* Comments sheet */}
      <CommentsModal
        visible={modals.showComments}
        onClose={() => modals.setShowComments(false)}
        postId={commentsPostId}
        userId={user?.id}
        comments={modals.comments}
        onCommentsUpdate={modals.setComments}
        onCountUpdate={(count) => {
          if (commentsPostId) {
            setEngagementCounts((prev) => ({
              ...prev,
              [commentsPostId]: {
                ...(prev[commentsPostId] || {
                  likes: 0,
                  saves: 0,
                  comments: 0,
                  reposts: 0,
                  hasLiked: false,
                  hasSaved: false,
                  hasReposted: false,
                }),
                comments: count,
              },
            }));
          }
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  feed: {
    paddingVertical: theme.spacing.sm,
  },
});

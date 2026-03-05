/**
 * HeadshotSocialTab Component
 * Renders Following / Explore feeds for headshot posts.
 * 3-column grid → tapping navigates to the user's feed screen (scoped to that post).
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { DiscoverGrid } from '@/components/social/DiscoverGrid';
import { PostMenuModal, CommentsModal } from '@/components/social';
import { useHeadshotFollowingFeed } from '@/hooks/social/useHeadshotFollowingFeed';
import { useHeadshotDiscoverFeed } from '@/hooks/social/useHeadshotDiscoverFeed';
import { useEngagementFeed } from '@/hooks/engagement';
import { useSocialModals } from '@/hooks/social/useSocialModals';
import { FeedItem } from '@/lib/posts';

interface HeadshotSocialTabProps {
  activeTab: 'following' | 'inspiration';
  currentUserId: string | undefined;
  onApplyLook: (variationId: string, inputSnapshotJson: any) => void;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  contentContainerStyle?: ViewStyle;
}

export default function HeadshotSocialTab({
  activeTab,
  currentUserId,
  onApplyLook,
  onScroll,
  scrollEventThrottle = 16,
  contentContainerStyle,
}: HeadshotSocialTabProps) {
  const router = useRouter();

  const following = useHeadshotFollowingFeed({ userId: currentUserId });
  const discover = useHeadshotDiscoverFeed({ userId: currentUserId });

  const activeFeed = activeTab === 'following' ? following : discover;
  const headshotImages = activeFeed.headshotImages;

  const feedEngagementCounts =
    'engagementCounts' in activeFeed ? activeFeed.engagementCounts : {};

  const eng = useEngagementFeed(currentUserId, {
    initialCounts: feedEngagementCounts,
    onRepost: async () => { await activeFeed.refresh(); },
  });

  React.useEffect(() => {
    eng.seedCounts(feedEngagementCounts);
  }, [feedEngagementCounts]);

  const { handleLike, handleSave, handleRepost } = eng;

  const modals = useSocialModals({ refreshFeed: activeFeed.refresh });

  const handleItemPress = useCallback(
    (item: FeedItem) => {
      const post = item.post;
      if (!post) return;
      router.push(`/users/${post.owner_user_id}/feed?postId=${post.id}` as any);
    },
    [router]
  );

  // Build image map keyed by headshot entity id for DiscoverGrid
  const gridImages = new Map<string, string | null>();
  activeFeed.feed.forEach(item => {
    const h = item.entity?.headshot;
    if (h) {
      gridImages.set(h.id, headshotImages.get(h.id) ?? null);
    }
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await activeFeed.refresh();
    setRefreshing(false);
  };

  const openMenuFeedItem = activeFeed.feed.find(item => {
    const post = item.type === 'post' ? item.post! : item.repost?.original_post;
    return post?.id === modals.openMenuPostId;
  }) ?? null;

  return (
    <View style={styles.container}>
      <DiscoverGrid
        feed={activeFeed.feed}
        images={gridImages}
        loading={activeFeed.loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onLoadMore={'loadMore' in activeFeed ? (activeFeed as typeof discover).loadMore : async () => {}}
        hasMore={'hasMore' in activeFeed ? (activeFeed as typeof discover).hasMore : false}
        onItemPress={handleItemPress}
        emptyTitle="No headshot posts yet"
        emptyMessage={
          activeTab === 'following'
            ? 'Follow people to see their looks here'
            : 'Be the first to share your look!'
        }
        emptyIcon="sparkles-outline"
        showOwnerOverlay
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={contentContainerStyle}
      />

      <PostMenuModal
        visible={modals.openMenuPostId !== null}
        feedItem={openMenuFeedItem}
        currentUserId={currentUserId}
        isFollowingOwner={false}
        buttonPosition={modals.menuButtonPosition}
        tryingOnOutfit={false}
        unfollowingUserId={null}
        onClose={() => modals.setOpenMenuPostId(null)}
        onEditOutfit={() => {}}
        onDeletePost={modals.handleDeletePost}
        onTryOnOutfit={() => {}}
        onApplyLook={onApplyLook}
        onUnfollow={() => {}}
      />

      <CommentsModal
        visible={modals.showComments}
        postId={
          modals.selectedItem
            ? (modals.selectedItem.type === 'post'
                ? modals.selectedItem.post?.id
                : modals.selectedItem.repost?.original_post?.id) ?? null
            : null
        }
        userId={currentUserId}
        comments={modals.comments}
        onClose={() => modals.setShowComments(false)}
        onCommentsUpdate={modals.setComments}
        onCountUpdate={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

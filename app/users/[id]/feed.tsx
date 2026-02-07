/**
 * User Feed Screen (Refactored)
 * View a specific user's posts
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
import { useFeed, useSocialEngagement } from '@/hooks/social';
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
  const { feed, outfitImages, lookbookImages, engagementCounts, setEngagementCounts, loading, refresh } =
    useFeed({
      userId: user?.id,
      filterByUserId: userId,
    });

  // Social engagement
  const { handleLike, handleSave, handleRepost, liking, saving, reposting } =
    useSocialEngagement({
      userId: user?.id,
      engagementCounts,
      setEngagementCounts,
      onRepost: refresh,
    });

  // Slideshow for lookbooks
  const slideshow = useSlideshow();

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderFeedItem = ({ item }: { item: any }) => {
    const post = item.type === 'post' ? item.post : item.repost?.original_post;
    if (!post) return null;

    const engagement = engagementCounts[post.id] || {
      likes: 0,
      saves: 0,
      comments: 0,
      reposts: 0,
      hasLiked: false,
      hasSaved: false,
      hasReposted: false,
    };

    // Render outfit post
    if (post.entity_type === 'outfit' && item.entity?.outfit) {
      const outfit = item.entity.outfit;
      const imageUrl = outfitImages.get(outfit.id);

      return (
        <FeedCard
          item={item}
          onUserPress={(targetUserId) => router.push(`/users/${targetUserId}`)}
          caption={post.caption}
          actions={
            <SocialActionBar
              counts={engagement}
              onLike={() => handleLike(post.id)}
              onComment={() => {}}
              onRepost={() => handleRepost(post.id)}
              onSave={() => handleSave(post.id)}
              liking={liking.has(post.id)}
              saving={saving.has(post.id)}
              reposting={reposting.has(post.id)}
            />
          }
        >
          <FeedOutfitCard
            outfit={outfit}
            imageUrl={imageUrl}
            onPress={() => {}}
          />
        </FeedCard>
      );
    }

    // Render lookbook post
    if (post.entity_type === 'lookbook' && item.entity?.lookbook) {
      const lookbook = item.entity.lookbook;

      const lookbookOutfits = lookbookImages.get(`${lookbook.id}_outfits`) || [];
      return (
        <FeedCard
          item={item}
          onUserPress={(targetUserId) => router.push(`/users/${targetUserId}`)}
          caption={post.caption}
          actions={
            <SocialActionBar
              counts={engagement}
              onLike={() => handleLike(post.id)}
              onComment={() => {}}
              onRepost={() => handleRepost(post.id)}
              onSave={() => handleSave(post.id)}
              liking={liking.has(post.id)}
              saving={saving.has(post.id)}
              reposting={reposting.has(post.id)}
            />
          }
        >
          <FeedLookbookCarousel
            lookbook={lookbook}
            lookbookImages={lookbookImages}
            onPlayPress={() => slideshow.open(lookbookOutfits)}
            onPress={() => {}}
          />
        </FeedCard>
      );
    }

    return null;
  };

  const getPostId = (item: any) => {
    const post = item.type === 'post' ? item.post : item.repost?.original_post;
    return post?.id ?? null;
  };

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
        visible={slideshow.visible}
        outfits={slideshow.outfits}
        images={slideshow.images}
        currentIndex={slideshow.currentIndex}
        isAutoPlaying={slideshow.isAutoPlaying}
        onClose={slideshow.close}
        onNext={slideshow.next}
        onPrevious={slideshow.previous}
        onToggleAutoPlay={slideshow.toggleAutoPlay}
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

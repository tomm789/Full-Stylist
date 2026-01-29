/**
 * User Feed Screen (Refactored)
 * View a specific user's posts
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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

export default function UserFeedScreen() {
  const { user } = useAuth();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const [refreshing, setRefreshing] = useState(false);

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
          counts={engagement}
          currentUserId={user?.id}
          onUserPress={() => {}}
          onMenuPress={() => {}}
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
          counts={engagement}
          currentUserId={user?.id}
          onUserPress={() => {}}
          onMenuPress={() => {}}
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {feed.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="No posts yet"
          message="This user hasn't shared any outfits or lookbooks"
        />
      ) : (
        <FlatList
          data={feed}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feed}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  feed: {
    paddingVertical: 8,
  },
});

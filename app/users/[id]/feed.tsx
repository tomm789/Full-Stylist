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
  const { feed, outfitImages, lookbookImages, engagementCounts, loading, refresh } =
    useFeed({
      userId: user?.id,
      filterByUserId: userId,
    });

  // Social engagement
  const { handleLike, handleSave, handleRepost, liking, saving, reposting } =
    useSocialEngagement({
      userId: user?.id,
      onRepostComplete: refresh,
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
          userName={post.user?.display_name || post.user?.handle || 'User'}
          userAvatar={post.user?.headshot_image_url}
          timestamp={post.created_at}
          caption={post.caption}
          isRepost={item.type === 'repost'}
        >
          <FeedOutfitCard
            outfit={outfit}
            imageUrl={imageUrl}
            onPress={() => {}}
          />
          <SocialActionBar
            likes={engagement.likes}
            comments={engagement.comments}
            reposts={engagement.reposts}
            saves={engagement.saves}
            hasLiked={engagement.hasLiked}
            hasSaved={engagement.hasSaved}
            hasReposted={engagement.hasReposted}
            onLike={() => handleLike(post.id, engagement.hasLiked)}
            onComment={() => {}}
            onRepost={() => handleRepost(post.id, engagement.hasReposted)}
            onSave={() => handleSave(post.id, engagement.hasSaved)}
            liking={liking[post.id]}
            saving={saving[post.id]}
            reposting={reposting[post.id]}
          />
        </FeedCard>
      );
    }

    // Render lookbook post
    if (post.entity_type === 'lookbook' && item.entity?.lookbook) {
      const lookbook = item.entity.lookbook;
      const thumbnailUrl = lookbookImages.get(lookbook.id);
      const outfits = lookbookImages.get(`${lookbook.id}_outfits`) || [];

      return (
        <FeedCard
          userName={post.user?.display_name || post.user?.handle || 'User'}
          userAvatar={post.user?.headshot_image_url}
          timestamp={post.created_at}
          caption={post.caption}
          isRepost={item.type === 'repost'}
        >
          <FeedLookbookCarousel
            lookbook={lookbook}
            outfits={outfits}
            thumbnailUrl={thumbnailUrl}
            lookbookImages={lookbookImages}
            onPlayPress={() => slideshow.openSlideshow(outfits)}
            onPress={() => {}}
          />
          <SocialActionBar
            likes={engagement.likes}
            comments={engagement.comments}
            reposts={engagement.reposts}
            saves={engagement.saves}
            hasLiked={engagement.hasLiked}
            hasSaved={engagement.hasSaved}
            hasReposted={engagement.hasReposted}
            onLike={() => handleLike(post.id, engagement.hasLiked)}
            onComment={() => {}}
            onRepost={() => handleRepost(post.id, engagement.hasReposted)}
            onSave={() => handleSave(post.id, engagement.hasSaved)}
            liking={liking[post.id]}
            saving={saving[post.id]}
            reposting={reposting[post.id]}
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
        visible={slideshow.slideshowVisible}
        outfits={slideshow.slideshowOutfits}
        initialIndex={slideshow.currentIndex}
        onClose={slideshow.closeSlideshow}
        onIndexChange={slideshow.setCurrentIndex}
        isPlaying={slideshow.isPlaying}
        onTogglePlay={slideshow.togglePlay}
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

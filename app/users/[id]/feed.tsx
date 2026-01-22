import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getFeed, FeedItem } from '@/lib/posts';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { getLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import {
  likeEntity,
  unlikeEntity,
  hasLiked,
  getLikeCount,
  saveEntity,
  unsaveEntity,
  hasSaved,
  getSaveCount,
  getCommentCount,
} from '@/lib/engagement';
import { hasReposted, getRepostCount, createRepost, removeRepost } from '@/lib/reposts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_WIDTH = Math.min(SCREEN_WIDTH, 630);

export default function UserFeedScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: userId, postId } = useLocalSearchParams();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postImagesCache, setPostImagesCache] = useState<Map<string, string | null>>(new Map());
  const [lookbookImagesCache, setLookbookImagesCache] = useState<Map<string, any>>(new Map());
  const [initialScrollIndex, setInitialScrollIndex] = useState<number | null>(null);
  const [engagementCounts, setEngagementCounts] = useState<
    Record<
      string,
      { likes: number; saves: number; comments: number; reposts: number; hasLiked: boolean; hasSaved: boolean; hasReposted: boolean }
    >
  >({});

  useEffect(() => {
    if (userId && user) {
      loadUserFeed();
    }
  }, [userId, user]);

  const loadUserFeed = async () => {
    if (!userId || typeof userId !== 'string') return;

    setLoading(true);
    const { data } = await getFeed(userId, 50, 0);
    
    if (data) {
      // Filter to only this user's posts
      const userPosts = data.filter((item) => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        return post?.owner_user_id === userId;
      });
      
      setFeed(userPosts);

      // Find initial scroll position if postId provided
      if (postId && typeof postId === 'string') {
        const index = userPosts.findIndex((item) => item.id === postId);
        if (index !== -1) {
          setInitialScrollIndex(index);
        }
      }

      // Cache images
      const imageCache = new Map<string, string | null>();
      const lookbookCache = new Map<string, any>();
      
      for (const item of userPosts) {
        if (item.entity?.outfit) {
          const outfitId = item.entity.outfit.id;
          const url = await getOutfitCoverImageUrl(item.entity.outfit);
          imageCache.set(outfitId, url);
        } else if (item.entity?.lookbook) {
          const lookbookId = item.entity.lookbook.id;
          const { data: lookbookData } = await getLookbook(lookbookId);
          if (lookbookData && lookbookData.outfits.length > 0 && user) {
            const { data: allOutfits } = await getUserOutfits(user.id);
            if (allOutfits) {
              const lookbookOutfits = lookbookData.outfits
                .map((lo: any) => allOutfits.find((o: any) => o.id === lo.outfit_id))
                .filter(Boolean);
              
              // Store the outfits for carousel
              lookbookCache.set(`${lookbookId}_outfits`, lookbookOutfits);
              
              // Pre-load all outfit images for carousel
              for (const outfit of lookbookOutfits) {
                const url = await getOutfitCoverImageUrl(outfit);
                lookbookCache.set(`${lookbookId}_outfit_${outfit.id}`, url);
              }
              
              // Get first outfit image as thumbnail
              if (lookbookOutfits.length > 0) {
                const firstUrl = await getOutfitCoverImageUrl(lookbookOutfits[0]);
                imageCache.set(lookbookId, firstUrl);
              }
            }
          }
        }
      }
      setPostImagesCache(imageCache);
      setLookbookImagesCache(lookbookCache);

      // Load engagement counts for all items
      if (user) {
        const counts: typeof engagementCounts = {};
        await Promise.all(userPosts.map(async (item) => {
          const post = item.type === 'post' ? item.post! : item.repost!.original_post!;
          if (!post) return;

          const postId = post.id;
          const [likes, saves, comments, reposts, liked, saved, reposted] = await Promise.all([
            getLikeCount('post', postId),
            getSaveCount('post', postId),
            getCommentCount('post', postId),
            getRepostCount(postId),
            hasLiked(user.id, 'post', postId),
            hasSaved(user.id, 'post', postId),
            hasReposted(user.id, postId),
          ]);

          counts[postId] = {
            likes,
            saves,
            comments,
            reposts,
            hasLiked: liked,
            hasSaved: saved,
            hasReposted: reposted,
          };
        }));
        setEngagementCounts(counts);
      }
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserFeed();
    setRefreshing(false);
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    const currentlyLiked = engagementCounts[postId]?.hasLiked || false;

    if (currentlyLiked) {
      await unlikeEntity(user.id, 'post', postId);
    } else {
      await likeEntity(user.id, 'post', postId);
    }

    // Refresh counts
    const [likes, liked] = await Promise.all([
      getLikeCount('post', postId),
      hasLiked(user.id, 'post', postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        likes,
        hasLiked: liked,
      },
    }));
  };

  const handleSave = async (postId: string) => {
    if (!user) return;

    const currentlySaved = engagementCounts[postId]?.hasSaved || false;

    if (currentlySaved) {
      await unsaveEntity(user.id, 'post', postId);
    } else {
      await saveEntity(user.id, 'post', postId);
    }

    // Refresh counts
    const [saves, saved] = await Promise.all([
      getSaveCount('post', postId),
      hasSaved(user.id, 'post', postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        saves,
        hasSaved: saved,
      },
    }));
  };

  const handleRepost = async (postId: string) => {
    if (!user) return;

    const currentlyReposted = engagementCounts[postId]?.hasReposted || false;

    if (currentlyReposted) {
      await removeRepost(user.id, postId);
    } else {
      await createRepost(user.id, postId);
    }

    // Refresh counts
    const [reposts, reposted] = await Promise.all([
      getRepostCount(postId),
      hasReposted(user.id, postId),
    ]);

    setEngagementCounts((prev) => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        reposts,
        hasReposted: reposted,
      },
    }));

    // Refresh feed to show new repost
    await loadUserFeed();
  };

  const handleCommentPress = (item: FeedItem) => {
    const post = item.type === 'post' ? item.post : item.repost?.original_post;
    if (!post) return;
    
    // Navigate to outfit or lookbook view where comments are available
    if (post.entity_type === 'outfit' && item.entity?.outfit) {
      router.push(`/outfits/${item.entity.outfit.id}/view`);
    } else if (post.entity_type === 'lookbook' && item.entity?.lookbook) {
      router.push(`/lookbooks/${item.entity.lookbook.id}/view`);
    }
  };

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    const post = item.type === 'post' ? item.post : item.repost?.original_post;
    if (!post) return null;

    const isOutfit = post.entity_type === 'outfit';
    const entity = item.entity?.outfit || item.entity?.lookbook;

    const counts = engagementCounts[post.id] || {
      likes: 0,
      saves: 0,
      comments: 0,
      reposts: 0,
      hasLiked: false,
      hasSaved: false,
      hasReposted: false,
    };

    return (
      <View style={styles.feedCard}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.ownerName}>
            {item.owner?.display_name || item.owner?.handle || 'User'}
          </Text>
        </View>

        {/* Content */}
        <TouchableOpacity
          onPress={() => {
            if (isOutfit && entity) {
              router.push(`/outfits/${entity.id}/view`);
            } else if (!isOutfit && entity) {
              router.push(`/lookbooks/${entity.id}`);
            }
          }}
        >
          {isOutfit ? (
            <FeedOutfitCard outfit={entity} imageUrl={postImagesCache.get(entity?.id || '')} />
          ) : (
            <LookbookCarousel
              lookbook={entity}
              lookbookImagesCache={lookbookImagesCache}
            />
          )}
        </TouchableOpacity>

        {/* Caption */}
        {post.caption && <Text style={styles.caption}>{post.caption}</Text>}

        {/* Social Actions */}
        <View style={styles.socialActions}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLike(post.id)}
            >
              <Ionicons
                name={counts.hasLiked ? 'heart' : 'heart-outline'}
                size={28}
                color={counts.hasLiked ? '#ff0000' : '#000'}
              />
              {counts.likes > 0 && <Text style={styles.actionCount}>{counts.likes}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCommentPress(item)}
            >
              <Ionicons name="chatbubble-outline" size={26} color="#000" />
              {counts.comments > 0 && <Text style={styles.actionCount}>{counts.comments}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRepost(post.id)}
            >
              <Ionicons
                name={counts.hasReposted ? 'repeat' : 'repeat-outline'}
                size={28}
                color={counts.hasReposted ? '#00ba7c' : '#000'}
              />
              {counts.reposts > 0 && <Text style={styles.actionCount}>{counts.reposts}</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSave(post.id)}
            >
              <Ionicons
                name={counts.hasSaved ? 'bookmark' : 'bookmark-outline'}
                size={26}
                color={counts.hasSaved ? '#007AFF' : '#000'}
              />
              {counts.saves > 0 && <Text style={styles.actionCount}>{counts.saves}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Posts</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts</Text>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={feed}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        style={styles.feedList}
        contentContainerStyle={styles.feedListContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialScrollIndex={initialScrollIndex !== null ? initialScrollIndex : undefined}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH * 1.5 + 100, // Approximate item height
          offset: (SCREEN_WIDTH * 1.5 + 100) * index,
          index,
        })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Feed Outfit Card Component
const FeedOutfitCard = React.memo(({ outfit, imageUrl }: { outfit: any; imageUrl: string | null | undefined }) => {
  return (
    <View style={styles.outfitCard}>
      {imageUrl ? (
        <ExpoImage
          source={{ uri: imageUrl }}
          style={styles.postImage}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.postImagePlaceholder}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}
    </View>
  );
});

// Lookbook Carousel Component
const LookbookCarousel = React.memo(({ lookbook, lookbookImagesCache }: { lookbook: any; lookbookImagesCache: Map<string, any> }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const outfits = lookbookImagesCache.get(`${lookbook.id}_outfits`) || [];
  
  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / MAX_WIDTH);
    setCurrentIndex(index);
  };

  if (outfits.length === 0) {
    return (
      <View style={styles.postImagePlaceholder}>
        <ActivityIndicator size="small" color="#999" />
      </View>
    );
  }

  return (
    <View style={styles.lookbookContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.lookbookCarousel}
      >
        {outfits.map((outfit: any) => {
          const imageUrl = lookbookImagesCache.get(`${lookbook.id}_outfit_${outfit.id}`);
          return (
            <View key={outfit.id} style={[styles.lookbookCarouselItem, { width: MAX_WIDTH }]}>
              {imageUrl ? (
                <ExpoImage
                  source={{ uri: imageUrl }}
                  style={styles.postImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.postImagePlaceholder}>
                  <ActivityIndicator size="small" color="#999" />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      
      {/* Pagination Dots */}
      {outfits.length > 1 && (
        <View style={styles.paginationDots}>
          {outfits.map((_: any, index: number) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive
              ]}
            />
          ))}
        </View>
      )}
      
      {/* Lookbook Badge */}
      <View style={styles.lookbookBadge}>
        <Ionicons name="book" size={16} color="#fff" />
        <Text style={styles.lookbookBadgeText}>Lookbook</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedList: {
    width: '100%',
    maxWidth: 630,
    alignSelf: 'center',
  },
  feedListContent: {
    paddingBottom: 20,
  },
  feedCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  outfitCard: {
    width: '100%',
  },
  postImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
  },
  postImagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookbookContainer: {
    position: 'relative',
    width: '100%',
  },
  lookbookCarousel: {
    width: '100%',
  },
  lookbookCarouselItem: {
    width: '100%',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lookbookBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  lookbookBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  caption: {
    fontSize: 14,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  socialActions: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

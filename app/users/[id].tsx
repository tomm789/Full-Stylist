import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getFullUserProfile, followUser, unfollowUser, isFollowing } from '@/lib/user';
import { getFeed, FeedItem } from '@/lib/posts';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { getLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import UserWardrobeScreen from '@/app/components/UserWardrobeScreen';

type TabType = 'posts' | 'wardrobe';

export default function UserProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: userId } = useLocalSearchParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followState, setFollowState] = useState<{
    isFollowing: boolean;
    status: string | null;
  }>({ isFollowing: false, status: null });
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [postImagesCache, setPostImagesCache] = useState<Map<string, string | null>>(new Map());
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  useEffect(() => {
    if (userId && user) {
      loadProfile();
      checkFollowStatus();
      loadUserPosts();
    }
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId || typeof userId !== 'string') return;

    setLoading(true);
    const { data } = await getFullUserProfile(userId);
    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const checkFollowStatus = async () => {
    if (!user || !userId || typeof userId !== 'string') return;

    const result = await isFollowing(user.id, userId);
    setFollowState(result);
  };

  const loadUserPosts = async () => {
    if (!userId || typeof userId !== 'string') return;

    // Get posts by this user
    const { data } = await getFeed(userId, 50, 0);
    
    if (data) {
      const userPosts = data.filter((item) => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        return post?.owner_user_id === userId;
      });
      
      setPosts(userPosts);

      // Cache images for outfit and lookbook posts
      const imageCache = new Map<string, string | null>();
      for (const item of userPosts) {
        if (item.entity?.outfit) {
          const outfitId = item.entity.outfit.id;
          const url = await getOutfitCoverImageUrl(item.entity.outfit);
          imageCache.set(outfitId, url);
        } else if (item.entity?.lookbook) {
          // Get lookbook cover image (first outfit in lookbook)
          const lookbookId = item.entity.lookbook.id;
          const { data: lookbookData } = await getLookbook(lookbookId);
          if (lookbookData && lookbookData.outfits.length > 0) {
            // Get user's outfits to find the first one
            if (user) {
              const { data: allOutfits } = await getUserOutfits(user.id);
              if (allOutfits) {
                const firstOutfit = allOutfits.find((o: any) => 
                  o.id === lookbookData.outfits[0].outfit_id
                );
                if (firstOutfit) {
                  const url = await getOutfitCoverImageUrl(firstOutfit);
                  imageCache.set(lookbookId, url);
                }
              }
            }
          }
        }
      }
      
      setPostImagesCache(imageCache);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), checkFollowStatus(), loadUserPosts()]);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!user || !userId || typeof userId !== 'string') return;

    setLoadingFollow(true);
    if (followState.isFollowing) {
      const { error } = await unfollowUser(user.id, userId);
      if (!error) {
        setFollowState({ isFollowing: false, status: null });
      }
    } else {
      const { error } = await followUser(user.id, userId);
      if (!error) {
        setFollowState({ isFollowing: true, status: 'requested' });
        // Re-check status to get actual state
        checkFollowStatus();
      }
    }
    setLoadingFollow(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = user?.id === userId;

  const renderTabContent = () => {
    if (activeTab === 'wardrobe') {
      return <UserWardrobeScreen userId={typeof userId === 'string' ? userId : ''} />;
    }

    // Posts tab
    return (
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts ({posts.length})</Text>
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <Ionicons name="images-outline" size={48} color="#ccc" />
              <Text style={styles.emptyPostsText}>No posts yet</Text>
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((item) => {
                const isOutfit = item.type === 'post' 
                  ? item.post?.entity_type === 'outfit' 
                  : item.repost?.original_post?.entity_type === 'outfit';
                const entity = item.entity?.outfit || item.entity?.lookbook;
                
                if (!entity) return null;

                const imageUrl = postImagesCache.get(entity.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.postGridItem}
                    onPress={() => router.push(`/users/${userId}/feed?postId=${item.id}`)}
                  >
                    <View style={styles.postItemContainer}>
                      {imageUrl ? (
                        <ExpoImage
                          source={{ uri: imageUrl }}
                          style={styles.postImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : postImagesCache.has(entity.id) ? (
                        <View style={styles.postImagePlaceholder}>
                          <ActivityIndicator size="small" color="#999" />
                        </View>
                      ) : (
                        <View style={styles.postImagePlaceholder}>
                          <Ionicons 
                            name={isOutfit ? "shirt-outline" : "book-outline"} 
                            size={32} 
                            color="#999" 
                          />
                        </View>
                      )}
                      {/* Lookbook indicator icon */}
                      {!isOutfit && (
                        <View style={styles.lookbookBadge}>
                          <Ionicons name="book" size={20} color="#000" style={styles.lookbookIcon} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.handle}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        scrollEnabled={false}
      >
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.headshot_image_url ? (
              <ExpoImage
                source={{ uri: profile.headshot_image_url }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <Ionicons name="person-circle-outline" size={100} color="#999" />
            )}
          </View>

          <Text style={styles.displayName}>{profile.display_name}</Text>
          <Text style={styles.handle}>@{profile.handle}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats?.posts || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats?.followers || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.stats?.following || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {/* Follow Button */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[
                styles.followButton,
                followState.isFollowing && styles.followingButton,
              ]}
              onPress={handleFollow}
              disabled={loadingFollow}
            >
              {loadingFollow ? (
                <ActivityIndicator size="small" color={followState.isFollowing ? '#007AFF' : '#fff'} />
              ) : (
                <Text
                  style={[
                    styles.followButtonText,
                    followState.isFollowing && styles.followingButtonText,
                  ]}
                >
                  {followState.isFollowing
                    ? followState.status === 'requested'
                      ? 'Requested'
                      : 'Following'
                    : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Tabs - Only show when viewing another user's profile */}
      {!isOwnProfile && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
              Posts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'wardrobe' && styles.tabActive]}
            onPress={() => setActiveTab('wardrobe')}
          >
            <Text style={[styles.tabText, activeTab === 'wardrobe' && styles.tabTextActive]}>
              Wardrobe
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
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
  },
  profileSection: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatar: {
    width: 100,
    height: 100,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  followingButtonText: {
    color: '#007AFF',
  },
  postsSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 16,
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyPostsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -1,
  },
  postGridItem: {
    width: '33.33%',
    aspectRatio: 3 / 4,
    padding: 1,
  },
  postItemContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  postImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lookbookBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lookbookIcon: {
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { getOutfitCoverImageUrl } from '@/lib/images';
import { getLookbook, getUserLookbooks, Lookbook } from '@/lib/lookbooks';
import { getUserOutfits, Outfit } from '@/lib/outfits';
import UserWardrobeScreen from '@/app/components/UserWardrobeScreen';

type TabType = 'outfits' | 'lookbooks' | 'wardrobe';

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
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [outfitImagesCache, setOutfitImagesCache] = useState<Map<string, string | null>>(new Map());
  const [lookbookImagesCache, setLookbookImagesCache] = useState<Map<string, string | null>>(new Map());
  const [activeTab, setActiveTab] = useState<TabType>('outfits');

  useEffect(() => {
    if (userId && user) {
      loadProfile();
      checkFollowStatus();
      loadUserContent();
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

  const loadUserContent = async () => {
    if (!userId || typeof userId !== 'string') return;

    const [{ data: outfitsData }, { data: lookbooksData }] = await Promise.all([
      getUserOutfits(userId),
      getUserLookbooks(userId),
    ]);

    setOutfits(outfitsData || []);
    setLookbooks(lookbooksData || []);

    const outfitImageCache = new Map<string, string | null>();
    await Promise.all(
      (outfitsData || []).map(async (outfit) => {
        const url = await getOutfitCoverImageUrl(outfit);
        outfitImageCache.set(outfit.id, url);
      })
    );
    setOutfitImagesCache(outfitImageCache);

    const lookbookImageCache = new Map<string, string | null>();
    if (lookbooksData && outfitsData) {
      await Promise.all(
        lookbooksData.map(async (lookbook) => {
          const { data: lookbookData } = await getLookbook(lookbook.id);
          if (lookbookData?.outfits.length) {
            const firstOutfitId = lookbookData.outfits[0].outfit_id;
            const firstOutfit = outfitsData.find((outfit) => outfit.id === firstOutfitId);
            if (firstOutfit) {
              const url = await getOutfitCoverImageUrl(firstOutfit);
              lookbookImageCache.set(lookbook.id, url);
              return;
            }
          }
          lookbookImageCache.set(lookbook.id, null);
        })
      );
    }
    setLookbookImagesCache(lookbookImageCache);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), checkFollowStatus(), loadUserContent()]);
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

  const renderProfileHeader = () => (
    <View>
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
            <Text style={styles.statValue}>{outfits.length}</Text>
            <Text style={styles.statLabel}>Outfits</Text>
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

      {/* Tabs - Only show when viewing another user's profile */}
      {!isOwnProfile && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'outfits' && styles.tabActive]}
            onPress={() => setActiveTab('outfits')}
          >
            <Text style={[styles.tabText, activeTab === 'outfits' && styles.tabTextActive]}>
              Outfits
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lookbooks' && styles.tabActive]}
            onPress={() => setActiveTab('lookbooks')}
          >
            <Text style={[styles.tabText, activeTab === 'lookbooks' && styles.tabTextActive]}>
              Lookbooks
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
    </View>
  );

  const renderOutfitItem = ({ item }: { item: Outfit }) => {
    const imageUrl = outfitImagesCache.get(item.id);

    return (
      <TouchableOpacity
        style={styles.postGridItem}
        onPress={() => router.push(`/outfits/${item.id}/view`)}
      >
        <View style={styles.postItemContainer}>
          {imageUrl ? (
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.postImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : outfitImagesCache.has(item.id) ? (
            <View style={styles.postImagePlaceholder}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : (
            <View style={styles.postImagePlaceholder}>
              <Ionicons name="shirt-outline" size={32} color="#999" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderLookbookItem = ({ item }: { item: Lookbook }) => {
    const imageUrl = lookbookImagesCache.get(item.id);

    return (
      <TouchableOpacity
        style={styles.postGridItem}
        onPress={() => router.push(`/lookbooks/${item.id}/view`)}
      >
        <View style={styles.postItemContainer}>
          {imageUrl ? (
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.postImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : lookbookImagesCache.has(item.id) ? (
            <View style={styles.postImagePlaceholder}>
              <ActivityIndicator size="small" color="#999" />
            </View>
          ) : (
            <View style={styles.postImagePlaceholder}>
              <Ionicons name="book-outline" size={32} color="#999" />
            </View>
          )}
          <View style={styles.lookbookBadge}>
            <Ionicons name="book" size={20} color="#000" style={styles.lookbookIcon} />
          </View>
        </View>
      </TouchableOpacity>
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

      {activeTab === 'wardrobe' && !isOwnProfile ? (
        <UserWardrobeScreen
          userId={typeof userId === 'string' ? userId : ''}
          headerComponent={renderProfileHeader()}
        />
      ) : activeTab === 'lookbooks' ? (
        <FlatList
          data={lookbooks}
          renderItem={renderLookbookItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={(
            <View>
              {renderProfileHeader()}
              <View style={styles.postsSectionHeader}>
                <Text style={styles.sectionTitle}>Lookbooks ({lookbooks.length})</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.postsListContent}
          columnWrapperStyle={styles.postsColumn}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={(
            <View style={styles.emptyPosts}>
              <Ionicons name="book-outline" size={48} color="#ccc" />
              <Text style={styles.emptyPostsText}>No lookbooks yet</Text>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={outfits}
          renderItem={renderOutfitItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={(
            <View>
              {renderProfileHeader()}
              <View style={styles.postsSectionHeader}>
                <Text style={styles.sectionTitle}>Outfits ({outfits.length})</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.postsListContent}
          columnWrapperStyle={styles.postsColumn}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={(
            <View style={styles.emptyPosts}>
              <Ionicons name="images-outline" size={48} color="#ccc" />
              <Text style={styles.emptyPostsText}>No outfits yet</Text>
            </View>
          )}
        />
      )}
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
  postsSectionHeader: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
  postsListContent: {
    paddingBottom: 24,
  },
  postsColumn: {
    paddingHorizontal: 1,
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
});

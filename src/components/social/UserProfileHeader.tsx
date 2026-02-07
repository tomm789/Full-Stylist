/**
 * User Profile Screen (Refactored)
 * View another user's profile with outfits and lookbooks
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, useFollowStatus } from '@/hooks/social';
import { ProfileHeader } from '@/components/profile';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { commonStyles } from '@/styles';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';

/** Header component for user profile; accepts profile + stats and renders via ProfileHeader */
export function UserProfileHeader({
  profile,
  outfitCount,
  isOwnProfile,
  isFollowing,
  followStatus,
  loadingFollow,
  onFollowPress,
}: {
  profile: any;
  outfitCount: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followStatus: string;
  loadingFollow: boolean;
  onFollowPress: () => Promise<void>;
}) {
  return (
    <ProfileHeader
      profile={profile}
      primaryStat={{ label: 'Outfits', value: outfitCount }}
      isOwnProfile={isOwnProfile}
      isFollowing={isFollowing}
      followStatus={followStatus}
      loadingFollow={loadingFollow}
      onFollowPress={onFollowPress}
    />
  );
}

type TabType = 'outfits' | 'lookbooks';

export default function UserProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('outfits');
  const [refreshing, setRefreshing] = useState(false);

  // Load user profile
  const {
    profile,
    outfits,
    lookbooks,
    outfitImages,
    lookbookImages,
    outfitWearCounts,
    loading,
    refresh,
    isOwnProfile,
  } = useUserProfile({ userId, currentUserId: user?.id });

  console.log('[UserProfileScreen] DEBUG', {
    userId,
    currentUserId: user?.id,
    isOwnProfile,
    hasProfile: !!profile,
  });

  // Follow status
  const { isFollowing, status, loading: followLoading, follow, unfollow } =
    useFollowStatus({
      currentUserId: user?.id,
      targetUserId: userId,
    });

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleFollowPress = async () => {
    if (isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
  };

  if (loading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        icon="person-outline"
        title="User not found"
        message="This user may not exist or has been deleted"
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profile Header */}
      <UserProfileHeader
        profile={profile}
        outfitCount={outfits.length}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        followStatus={status}
        loadingFollow={followLoading}
        onFollowPress={handleFollowPress}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outfits' && styles.tabActive]}
          onPress={() => setActiveTab('outfits')}
        >
          <Ionicons
            name="shirt-outline"
            size={20}
            color={activeTab === 'outfits' ? '#000' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'outfits' && styles.tabTextActive]}>
            Outfits ({outfits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lookbooks' && styles.tabActive]}
          onPress={() => setActiveTab('lookbooks')}
        >
          <Ionicons
            name="book-outline"
            size={20}
            color={activeTab === 'lookbooks' ? '#000' : '#999'}
          />
          <Text
            style={[styles.tabText, activeTab === 'lookbooks' && styles.tabTextActive]}
          >
            Lookbooks ({lookbooks.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'outfits' ? (
          outfits.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              title="No outfits yet"
              message={
                isOwnProfile
                  ? 'Create your first outfit to get started'
                  : 'This user has not created any outfits yet'
              }
            />
          ) : (
            <PostGrid
              data={outfits}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const imageUrl = outfitImages.get(item.id);
                const wearCount = outfitWearCounts.get(item.id) || 0;

                return (
                  <TouchableOpacity
                    style={postGridStyles.gridItem}
                    onPress={() => router.push(`/outfits/${item.id}`)}
                  >
                    {imageUrl ? (
                      <ExpoImage
                        source={{ uri: imageUrl }}
                        style={postGridStyles.gridImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={postGridStyles.gridImagePlaceholder} />
                    )}
                    <View style={postGridStyles.infoOverlay}>
                      <Text style={styles.outfitTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {wearCount > 0 && (
                        <View style={styles.wearBadge}>
                          <Ionicons name="people" size={12} color="#fff" />
                          <Text style={styles.wearCount}>{wearCount}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )
        ) : lookbooks.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No lookbooks yet"
            message={
              isOwnProfile
                ? 'Create your first lookbook to get started'
                : 'This user has not created any lookbooks yet'
            }
          />
        ) : (
          <PostGrid
            data={lookbooks}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const thumbnailUrl = lookbookImages.get(item.id);
              return (
                <TouchableOpacity
                  style={postGridStyles.gridItem}
                  onPress={() => router.push(`/lookbooks/${item.id}`)}
                >
                  {thumbnailUrl ? (
                    <ExpoImage
                      source={{ uri: thumbnailUrl }}
                      style={postGridStyles.gridImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={postGridStyles.gridImagePlaceholder} />
                  )}
                  <View style={postGridStyles.infoOverlay}>
                    <Text style={styles.lookbookTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.lookbookCount}>
                      {item.outfit_count || 0} outfits
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    minHeight: 400,
  },
  outfitTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  wearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  wearCount: {
    fontSize: 11,
    color: '#fff',
  },
  lookbookTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  lookbookCount: {
    fontSize: 11,
    color: '#ccc',
  },
});

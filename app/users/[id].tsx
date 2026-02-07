/**
 * User Profile Screen (Refactored)
 * View another user's profile with outfits and lookbooks
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, useFollowStatus, useFeed } from '@/hooks/social';
import { ProfileHeader } from '@/components/profile';
import UserWardrobeScreen from '@/components/UserWardrobeScreen';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { DiscoverGrid } from '@/components/social';
import { Header } from '@/components/shared/layout';
import { theme, commonStyles } from '@/styles';
import { useHideHeaderOnScroll } from '@/hooks/useHideHeaderOnScroll';

const { colors, spacing, typography } = theme;

type TabType = 'outfits' | 'lookbooks' | 'wardrobe';

export default function UserProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('outfits');
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();
  const showTabLabels = Platform.OS === 'web' && width >= 1024;
  const {
    headerHeight,
    headerOpacity,
    headerTranslate,
    headerReady,
    uiHidden,
    handleHeaderLayout,
    handleScroll: handleProfileScroll,
  } = useHideHeaderOnScroll();

  // Load user profile
  const {
    profile,
    outfits,
    loading,
    refreshingContent,
    refresh,
    refreshContent,
    isOwnProfile,
  } = useUserProfile({ userId, currentUserId: user?.id });

  const {
    feed,
    outfitImages: feedOutfitImages,
    lookbookImages: feedLookbookImages,
    loading: feedLoading,
    refresh: refreshFeed,
  } = useFeed({
    userId: user?.id,
    filterByUserId: userId,
    limit: 60,
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
    await refreshFeed();
    setRefreshing(false);
  };

  const handleFeedRefresh = async () => {
    await refreshContent();
    await refreshFeed();
  };

  const outfitFeed = useMemo(
    () =>
      feed.filter((item) => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        return post?.entity_type === 'outfit';
      }),
    [feed]
  );

  const lookbookFeed = useMemo(
    () =>
      feed.filter((item) => {
        const post = item.type === 'post' ? item.post : item.repost?.original_post;
        return post?.entity_type === 'lookbook';
      }),
    [feed]
  );

  const lookbookGridImages = useMemo(() => {
    const map = new Map<string, string | null>();
    lookbookFeed.forEach((item) => {
      const lookbook = item.entity?.lookbook;
      if (!lookbook) return;
      map.set(lookbook.id, feedLookbookImages.get(lookbook.id) || null);
    });
    return map;
  }, [lookbookFeed, feedLookbookImages]);

  const handleOpenFeedPost = (item: any) => {
    const post = item.type === 'post' ? item.post : item.repost?.original_post;
    if (!post) return;
    router.push(`/users/${userId}/feed?postId=${post.id}`);
  };


  const handleFollowPress = async () => {
    if (isFollowing) {
      await unfollow();
    } else {
      await follow();
    }
    // Refresh tab content to reflect new access level
    await refreshContent();
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <Header showBack title="Profile" />
        <View style={commonStyles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <Header showBack title="Profile" />
        <EmptyState
          icon="person-outline"
          title="User not found"
          message="This user may not exist or has been deleted"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <Animated.View
        style={[
          styles.headerContainer,
          {
            height: headerReady ? headerHeight : undefined,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }],
          },
        ]}
        pointerEvents={uiHidden ? 'none' : 'auto'}
      >
        <View onLayout={handleHeaderLayout}>
          <Header
            showBack
            title={undefined}
            leftContent={
              <Text style={styles.headerHandle} numberOfLines={1}>
                @{profile.handle || 'unknown'}
              </Text>
            }
            rightContent={
              !isOwnProfile ? (
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    isFollowing && styles.followingButton,
                    followLoading && styles.followButtonDisabled,
                  ]}
                  onPress={handleFollowPress}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator color={isFollowing ? colors.primary : '#fff'} />
                  ) : (
                    <Text
                      style={[
                        styles.followButtonText,
                        isFollowing && styles.followingButtonText,
                      ]}
                    >
                      {isFollowing
                        ? status === 'requested'
                          ? 'Requested'
                          : 'Following'
                        : 'Follow'}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      </Animated.View>

      <ScrollView
        style={commonStyles.flex1}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={handleProfileScroll}
        scrollEventThrottle={16}
      >
        {/* Profile Header */}
        <ProfileHeader
          profile={profile}
          primaryStat={{ label: 'Outfits', value: outfits.length }}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          followStatus={status}
          loadingFollow={followLoading}
          onFollowPress={handleFollowPress}
          onFollowersPress={() => router.push(`/users/${userId}/followers`)}
          onFollowingPress={() => router.push(`/users/${userId}/following`)}
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
              color={activeTab === 'outfits' ? colors.textPrimary : colors.textTertiary}
            />
            {showTabLabels && (
              <Text style={[styles.tabText, activeTab === 'outfits' && styles.tabTextActive]}>
                Outfits
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lookbooks' && styles.tabActive]}
            onPress={() => setActiveTab('lookbooks')}
          >
            <Ionicons
              name="book-outline"
              size={20}
              color={activeTab === 'lookbooks' ? colors.textPrimary : colors.textTertiary}
            />
            {showTabLabels && (
              <Text
                style={[styles.tabText, activeTab === 'lookbooks' && styles.tabTextActive]}
              >
                Lookbooks
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'wardrobe' && styles.tabActive]}
            onPress={() => setActiveTab('wardrobe')}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={activeTab === 'wardrobe' ? colors.textPrimary : colors.textTertiary}
            />
            {showTabLabels && (
              <Text style={[styles.tabText, activeTab === 'wardrobe' && styles.tabTextActive]}>
                Wardrobe
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'wardrobe' ? (
            <UserWardrobeScreen
              userId={typeof userId === 'string' ? userId : ''}
              showSearchControls
              showAddButton={isOwnProfile}
              onGridScroll={handleProfileScroll}
              scrollEventThrottle={16}
            />
          ) : activeTab === 'outfits' ? (
            <DiscoverGrid
              feed={outfitFeed}
              images={feedOutfitImages}
              loading={feedLoading}
              refreshing={refreshingContent}
              onRefresh={handleFeedRefresh}
              onLoadMore={async () => {}}
              hasMore={false}
              alignLeft
              onItemPress={handleOpenFeedPost}
              scrollEnabled={false}
              emptyIcon="shirt-outline"
              emptyTitle="No outfits yet"
              emptyMessage={
                isOwnProfile
                  ? 'Create your first outfit to get started'
                  : 'This user has not created any outfits yet'
              }
              showOwnerOverlay={false}
            />
          ) : (
            <DiscoverGrid
              feed={lookbookFeed}
              images={lookbookGridImages}
              loading={feedLoading}
              refreshing={refreshingContent}
              onRefresh={handleFeedRefresh}
              onLoadMore={async () => {}}
              hasMore={false}
              alignLeft
              onItemPress={handleOpenFeedPost}
              scrollEnabled={false}
              emptyIcon="book-outline"
              emptyTitle="No lookbooks yet"
              emptyMessage={
                isOwnProfile
                  ? 'Create your first lookbook to get started'
                  : 'This user has not created any lookbooks yet'
              }
              showOwnerOverlay={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    fontSize: typography.fontSize.md,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
  content: {
    flex: 1,
    minHeight: 400,
  },
  headerHandle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginLeft: spacing.xs,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  followButtonDisabled: {
    opacity: 0.7,
  },
  followingButton: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    color: colors.textLight,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  followingButtonText: {
    color: colors.primary,
  },
});

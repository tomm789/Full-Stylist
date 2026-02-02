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
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile, useFollowStatus } from '@/hooks/social';
import { ProfileHeader } from '@/components/profile';
import UserWardrobeScreen from '@/components/UserWardrobeScreen';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { Header } from '@/components/shared/layout';
import { theme, commonStyles } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

type TabType = 'outfits' | 'lookbooks' | 'wardrobe';

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
    refreshingContent,
    refresh,
    refreshContent,
    isOwnProfile,
  } = useUserProfile({ userId, currentUserId: user?.id });

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
    // Refresh tab content to reflect new access level
    await refreshContent();
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <Header showBack title="Profile" />
        <LoadingSpinner />
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
      <Header
        showBack
        title={profile.display_name || profile.handle || 'Profile'}
      />

      <ScrollView
        style={commonStyles.flex1}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
              color={activeTab === 'lookbooks' ? colors.textPrimary : colors.textTertiary}
            />
            <Text
              style={[styles.tabText, activeTab === 'lookbooks' && styles.tabTextActive]}
            >
              Lookbooks ({lookbooks.length})
            </Text>
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
            <Text style={[styles.tabText, activeTab === 'wardrobe' && styles.tabTextActive]}>
              Wardrobe
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'wardrobe' ? (
            <UserWardrobeScreen
              userId={typeof userId === 'string' ? userId : ''}
              showSearchControls
              showAddButton={isOwnProfile}
            />
          ) : activeTab === 'outfits' ? (
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
              <View style={styles.grid}>
                {outfits.map((outfit) => {
                  const imageUrl = outfitImages.get(outfit.id);
                  const wearCount = outfitWearCounts.get(outfit.id) || 0;

                  return (
                    <TouchableOpacity
                      key={outfit.id}
                      style={styles.gridItem}
                      onPress={() => router.push(`/users/${userId}/feed`)}
                    >
                      {imageUrl ? (
                        <ExpoImage
                          source={{ uri: imageUrl }}
                          style={styles.gridImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={[styles.gridImage, commonStyles.imagePlaceholder]} />
                      )}
                      <View style={styles.outfitOverlay}>
                        <Text style={styles.outfitTitle} numberOfLines={1}>
                          {outfit.title}
                        </Text>
                        {wearCount > 0 && (
                          <View style={styles.wearBadge}>
                            <Ionicons name="people" size={12} color={colors.textLight} />
                            <Text style={styles.wearCount}>{wearCount}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
            <View style={styles.grid}>
              {lookbooks.map((lookbook) => {
                const thumbnailUrl = lookbookImages.get(lookbook.id);

                return (
                  <TouchableOpacity
                    key={lookbook.id}
                    style={styles.gridItem}
                    onPress={() => router.push(`/lookbooks/${lookbook.id}`)}
                  >
                    {thumbnailUrl ? (
                      <ExpoImage
                        source={{ uri: thumbnailUrl }}
                        style={styles.gridImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={[styles.gridImage, commonStyles.imagePlaceholder]} />
                    )}
                    <View style={styles.lookbookOverlay}>
                      <Text style={styles.lookbookTitle} numberOfLines={2}>
                        {lookbook.title}
                      </Text>
                      <Text style={styles.lookbookCount}>
                        {lookbook.outfit_count || 0} outfits
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.sm,
  },
  gridItem: {
    width: '50%',
    aspectRatio: 3 / 4,
    padding: spacing.xs,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundTertiary,
  },
  outfitOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  outfitTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
  },
  wearBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  wearCount: {
    fontSize: 11,
    color: colors.textLight,
  },
  lookbookOverlay: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.overlayDark,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  lookbookTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  lookbookCount: {
    fontSize: 11,
    color: colors.gray400,
  },
});

/**
 * Followers Screen
 * List of users following the profile.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { followUser, getFollowers, isFollowing, unfollowUser } from '@/lib/user/follows';
import { Header } from '@/components/shared/layout';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

type FollowerRow = {
  id: string;
  follower_user_id: string;
  follower?: {
    id: string;
    handle: string;
    display_name?: string;
    avatar_url?: string | null;
  };
};

const PAGE_SIZE = 30;

export default function FollowersScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const router = useRouter();
  const { user } = useAuth();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const [followers, setFollowers] = useState<FollowerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [followStatusMap, setFollowStatusMap] = useState<
    Record<string, { isFollowing: boolean; status: 'requested' | 'accepted' | 'blocked' | null }>
  >({});
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());

  const currentUserId = user?.id || null;
  const setFollowLoading = (targetId: string, isLoading: boolean) => {
    setFollowLoadingIds((prev) => {
      const next = new Set(prev);
      if (isLoading) {
        next.add(targetId);
      } else {
        next.delete(targetId);
      }
      return next;
    });
  };

  const updateFollowStatusForRows = async (
    rows: FollowerRow[],
    replace: boolean
  ) => {
    if (!currentUserId) return;

    const results = await Promise.all(
      rows.map(async (row) => {
        const targetId = row.follower?.id || row.follower_user_id;
        if (!targetId || targetId === currentUserId) return null;
        const status = await isFollowing(currentUserId, targetId);
        return { targetId, ...status };
      })
    );

    setFollowStatusMap((prev) => {
      const next = replace ? {} : { ...prev };
      results.forEach((result) => {
        if (!result) return;
        next[result.targetId] = {
          isFollowing: result.isFollowing,
          status: result.status,
        };
      });
      return next;
    });
  };

  const loadFollowers = async (nextOffset: number, replace: boolean) => {
    if (!userId) return;
    const { data } = await getFollowers(userId, PAGE_SIZE, nextOffset);
    const rows = data || [];
    setHasMore(rows.length === PAGE_SIZE);
    setOffset(nextOffset + rows.length);
    setFollowers((prev) => (replace ? rows : [...prev, ...rows]));
    await updateFollowStatusForRows(rows, replace);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFollowers(0, true);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      await loadFollowers(0, true);
      setLoading(false);
    };
    loadInitial();
  }, [userId]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadFollowers(offset, false);
    setLoadingMore(false);
  };

  const handleFollowPress = async (targetId: string) => {
    if (!currentUserId || targetId === currentUserId) return;
    const currentStatus = followStatusMap[targetId];
    setFollowLoading(targetId, true);
    if (currentStatus?.isFollowing) {
      await unfollowUser(currentUserId, targetId);
    } else {
      await followUser(currentUserId, targetId);
    }
    const status = await isFollowing(currentUserId, targetId);
    setFollowStatusMap((prev) => ({
      ...prev,
      [targetId]: { isFollowing: status.isFollowing, status: status.status },
    }));
    setFollowLoading(targetId, false);
  };

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <Header showBack title="Followers" backFallback={`/users/${userId}`} />
        <View style={commonStyles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <Header showBack title="Followers" backFallback={`/users/${userId}`} />

      {followers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No followers yet"
          message="When someone follows this account, they'll appear here."
        />
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const user = item.follower;
            const targetId = user?.id || item.follower_user_id;
            const displayName = user?.display_name || user?.handle || 'User';
            const handle = user?.handle ? `@${user.handle}` : '';
            const avatarUrl = user?.avatar_url || null;
            const followStatus = followStatusMap[targetId];
            const isFollowing = followStatus?.isFollowing ?? false;
            const followLabel = !currentUserId
              ? null
              : followStatus?.status === 'requested'
                ? 'Requested'
                : isFollowing
                  ? 'Following'
                  : 'Follow';
            const showFollowButton = !!currentUserId && targetId !== currentUserId;
            const isFollowLoading = followLoadingIds.has(targetId);

            return (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => router.push(`/users/${targetId}`)}
              >
                {avatarUrl ? (
                  <ExpoImage
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Ionicons name="person-circle-outline" size={52} color={colors.gray400} />
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.nameText}>{displayName}</Text>
                  {handle.length > 0 && <Text style={styles.handleText}>{handle}</Text>}
                </View>
                {showFollowButton ? (
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      isFollowing && styles.followingButton,
                      isFollowLoading && styles.followButtonDisabled,
                    ]}
                    onPress={() => handleFollowPress(targetId)}
                    disabled={isFollowLoading}
                  >
                    {isFollowLoading ? (
                      <ActivityIndicator size="small" color={isFollowing ? colors.primary : '#fff'} />
                    ) : (
                      <Text
                        style={[
                          styles.followButtonText,
                          isFollowing && styles.followingButtonText,
                        ]}
                      >
                        {followLabel}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  listContent: {
    paddingVertical: spacing.sm,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gray100,
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  handleText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
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
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  followingButtonText: {
    color: colors.primary,
  },
});

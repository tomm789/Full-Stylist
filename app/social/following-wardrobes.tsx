/**
 * Following Wardrobes Screen (Refactored)
 * View wardrobes of users you follow
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing } from '@/lib/user';
import { getDefaultWardrobeId, getWardrobeItems } from '@/lib/wardrobe';
import { getWardrobeItemImages } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { createCommonStyles } from '@/styles/commonStyles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

interface FollowedUser {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  wardrobeId?: string;
  itemCount?: number;
  previewImage?: string | null;
}

export default function FollowingWardrobesScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const commonStyles = createCommonStyles(colors);
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFollowingWardrobes = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data: following } = await getFollowing(user.id);
      if (!following) {
        setLoading(false);
        return;
      }

      // Load wardrobe info for each followed user
      const usersWithWardrobes = await Promise.all(
        following.map(async (followedUser) => {
          const { data: wardrobeId } = await getDefaultWardrobeId(followedUser.id);
          
          let itemCount = 0;
          let previewImage: string | null = null;

          if (wardrobeId) {
            const { data: items } = await getWardrobeItems(wardrobeId, {});
            itemCount = items?.length || 0;

            // Get preview image from first item
            if (items && items.length > 0) {
              const { data: images } = await getWardrobeItemImages(items[0].id);
              if (images && images.length > 0) {
                const firstImage = images[0].image;
                if (firstImage) {
                  const { data: urlData } = supabase.storage
                    .from(firstImage.storage_bucket || 'media')
                    .getPublicUrl(firstImage.storage_key);
                  previewImage = urlData.publicUrl;
                }
              }
            }
          }

          const followed = followedUser.followed;
          return {
            id: followedUser.followed_user_id,
            display_name: followed?.display_name ?? '',
            handle: followed?.handle ?? '',
            avatar_url: followed?.avatar_url ?? null,
            wardrobeId,
            itemCount,
            previewImage,
          };
        })
      );

      setUsers(usersWithWardrobes);
    } catch (error) {
      console.error('Error loading following wardrobes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFollowingWardrobes();
    setRefreshing(false);
  };

  useEffect(() => {
    loadFollowingWardrobes();
  }, [user]);

  if (loading) {
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {users.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Not following anyone yet"
          message="Follow users to see their wardrobes here"
          actionLabel="Explore"
          onAction={() => router.push('/social/explore')}
        />
      ) : (
        <FlatList
          data={users}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userCard}
              onPress={() =>
                item.wardrobeId
                  ? router.push(`/wardrobes/${item.wardrobeId}`)
                  : router.push(`/users/${item.id}`)
              }
            >
              <View style={styles.userInfo}>
                {item.avatar_url ? (
                  <ExpoImage
                    source={{ uri: item.avatar_url }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
                <View style={styles.userText}>
                  <Text style={styles.displayName}>{item.display_name}</Text>
                  <Text style={styles.handle}>@{item.handle}</Text>
                  <Text style={styles.itemCount}>
                    {item.itemCount || 0} items
                  </Text>
                </View>
              </View>
              {item.previewImage && (
                <ExpoImage
                  source={{ uri: item.previewImage }}
                  style={styles.previewImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.gray200,
    marginRight: 12,
  },
  userText: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  handle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  previewImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
  },
});

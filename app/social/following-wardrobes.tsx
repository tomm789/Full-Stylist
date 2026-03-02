/**
 * Following Wardrobes Screen (Refactored)
 * View wardrobes of users you follow
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getFollowing } from '@/lib/user';
import { getDefaultWardrobeId, getWardrobeItems, getWardrobeCategories } from '@/lib/wardrobe';
import { buildWardrobeItemsImageUrlCache, getWardrobeItemsImages } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { createCommonStyles } from '@/styles/commonStyles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from './following-wardrobes.styles';
import type { WardrobeItem } from '@/lib/wardrobe';

interface FollowedUser {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  wardrobeId?: string;
  itemCount?: number;
  previewImages?: Array<string | null>;
}

type EngagementCounts = Map<string, number>;
type CategoryNameMap = Map<string, string>;

const PREVIEW_GRID_SIZE = 9;

const normalizeCategoryName = (name?: string | null) =>
  (name ?? '').trim().toLowerCase();

const sortByEngagementThenRecent = (
  a: WardrobeItem,
  b: WardrobeItem,
  engagementCounts: EngagementCounts
) => {
  const aScore = engagementCounts.get(a.id) ?? 0;
  const bScore = engagementCounts.get(b.id) ?? 0;
  if (aScore !== bScore) return bScore - aScore;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

const sortByRecent = (a: WardrobeItem, b: WardrobeItem) =>
  new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const selectPreviewItemIds = (
  items: WardrobeItem[],
  engagementCounts: EngagementCounts,
  categoryNameById: CategoryNameMap
) => {
  if (!items.length) return [];

  const selected: WardrobeItem[] = [];
  const selectedIds = new Set<string>();
  const addItem = (item?: WardrobeItem) => {
    if (!item || selected.length >= PREVIEW_GRID_SIZE || selectedIds.has(item.id)) {
      return;
    }
    selected.push(item);
    selectedIds.add(item.id);
  };

  const byEngagement = [...items].sort((a, b) =>
    sortByEngagementThenRecent(a, b, engagementCounts)
  );
  byEngagement.forEach(addItem);

  const itemsByCategory = new Map<string, WardrobeItem[]>();
  items.forEach((item) => {
    if (!item.category_id) return;
    const bucket = itemsByCategory.get(item.category_id) || [];
    bucket.push(item);
    itemsByCategory.set(item.category_id, bucket);
  });

  const categoryPicks = Array.from(itemsByCategory.values())
    .map((list) =>
      [...list].sort((a, b) => sortByEngagementThenRecent(a, b, engagementCounts))[0]
    )
    .filter(Boolean)
    .sort((a, b) => sortByEngagementThenRecent(a, b, engagementCounts));
  categoryPicks.forEach(addItem);

  if (selected.length < PREVIEW_GRID_SIZE) {
    const categoryRecentPicks = Array.from(itemsByCategory.values())
      .map((list) => [...list].sort(sortByRecent)[0])
      .filter(Boolean)
      .sort(sortByRecent);
    categoryRecentPicks.forEach(addItem);
  }

  if (selected.length < PREVIEW_GRID_SIZE) {
    const dressCategoryIds = new Set(
      Array.from(categoryNameById.entries())
        .filter(([_, name]) => {
          const normalized = normalizeCategoryName(name);
          return normalized === 'dresses' || normalized === 'dress';
        })
        .map(([id]) => id)
    );
    const dresses = items
      .filter((item) => item.category_id && dressCategoryIds.has(item.category_id))
      .sort(sortByRecent);
    dresses.forEach(addItem);
  }

  if (selected.length < PREVIEW_GRID_SIZE) {
    const remaining = [...items].sort(sortByRecent);
    remaining.forEach(addItem);
  }

  return selected.slice(0, PREVIEW_GRID_SIZE).map((item) => item.id);
};

const getWardrobeItemSaveCounts = async (itemIds: string[]): Promise<EngagementCounts> => {
  if (itemIds.length === 0) return new Map();
  try {
    const { data, error } = await supabase
      .from('saved_wardrobe_items')
      .select('wardrobe_item_id')
      .in('wardrobe_item_id', itemIds);

    if (error || !data) return new Map();

    const counts = new Map<string, number>();
    data.forEach((row) => {
      const id = row.wardrobe_item_id as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return counts;
  } catch (error) {
    console.error('Error loading wardrobe item saves:', error);
    return new Map();
  }
};

export interface FollowingWardrobesScreenProps {
  selectedCategoryId?: string | null;
  selectedSubcategoryId?: string | null;
}

export default function FollowingWardrobesScreen({
  selectedCategoryId = null,
  selectedSubcategoryId = null,
}: FollowingWardrobesScreenProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

      const { data: categories } = await getWardrobeCategories();
      const categoryNameById = new Map(
        (categories || []).map((category) => [category.id, category.name])
      );

      // Load wardrobe info for each followed user
      const usersWithWardrobes = await Promise.all(
        following.map(async (followedUser) => {
          const followed = followedUser.followed;
          const followedUserId = followedUser.followed_user_id ?? followed?.id;
          if (!followedUserId) {
            return {
              id: followedUser.followed_user_id,
              display_name: followed?.display_name ?? '',
              handle: followed?.handle ?? '',
              avatar_url: followed?.avatar_url ?? null,
              wardrobeId: null,
              itemCount: 0,
              previewImage: null,
            };
          }

          const { data: wardrobeId } = await getDefaultWardrobeId(followedUserId);

          let itemCount = 0;
          let previewImages: Array<string | null> = [];

          if (wardrobeId) {
            const { data: rawItems } = await getWardrobeItems(wardrobeId, {
              ...(selectedCategoryId && { category_id: selectedCategoryId }),
            });
            let items = rawItems || [];
            if (selectedSubcategoryId && items.length > 0) {
              items = items.filter((item) => item.subcategory_id === selectedSubcategoryId);
            }
            itemCount = items.length;

            if (items.length > 0) {
              const itemIds = items.map((item) => item.id);
              const engagementCounts = await getWardrobeItemSaveCounts(itemIds);
              const previewItemIds = selectPreviewItemIds(
                items,
                engagementCounts,
                categoryNameById
              );
              const { data: imagesMap } = await getWardrobeItemsImages(previewItemIds);
              const urlCache = buildWardrobeItemsImageUrlCache(
                previewItemIds,
                imagesMap
              );
              previewImages = previewItemIds.map((id) => urlCache.get(id) ?? null);
            }
          }

          return {
            id: followedUser.followed_user_id,
            display_name: followed?.display_name ?? '',
            handle: followed?.handle ?? '',
            avatar_url: followed?.avatar_url ?? null,
            wardrobeId,
            itemCount,
            previewImages,
          };
        })
      );

      const hasActiveFilters = Boolean(selectedCategoryId || selectedSubcategoryId);
      const filteredUsers = hasActiveFilters
        ? usersWithWardrobes.filter((u) => (u.itemCount ?? 0) > 0)
        : usersWithWardrobes;

      setUsers(filteredUsers);
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
  }, [user, selectedCategoryId, selectedSubcategoryId]);

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
              onPress={() => router.push(`/users/${item.id}?tab=wardrobe`)}
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
              <View style={styles.previewGrid}>
                {Array.from({ length: PREVIEW_GRID_SIZE }).map((_, index) => {
                  const imageUrl = item.previewImages?.[index] || null;
                  return imageUrl ? (
                    <ExpoImage
                      key={`${item.id}-preview-${index}`}
                      source={{ uri: imageUrl }}
                      style={styles.previewImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View
                      key={`${item.id}-preview-${index}`}
                      style={styles.previewPlaceholder}
                    />
                  );
                })}
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={5}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

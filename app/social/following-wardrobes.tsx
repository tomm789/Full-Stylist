import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getWardrobeCategories, getUserWardrobeItems, getWardrobeItemsImages, WardrobeItem } from '@/lib/wardrobe';

type FollowedUser = {
  id: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type WardrobePreview = {
  user: FollowedUser;
  items: Array<{ id: string; title: string; imageUrl: string | null }>;
  wardrobeCount: number;
  outfitCount: number;
};

const priorityCategoryKeywords = ['dress', 'dresses', 'shoes', 'bags', 'bag', 'jewellery', 'jewelry'];

export default function FollowingWardrobesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<WardrobePreview[]>([]);

  const [categoryNameById, setCategoryNameById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await getWardrobeCategories();
      if (!data) return;
      setCategoryNameById(new Map(data.map((category) => [category.id, category.name])));
    };
    loadCategories();
  }, []);

  const selectPreviewItems = (items: WardrobeItem[]) => {
    const byCategory = new Map<string, WardrobeItem[]>();
    items.forEach((item) => {
      if (!item.category_id) return;
      const list = byCategory.get(item.category_id) || [];
      list.push(item);
      byCategory.set(item.category_id, list);
    });

    const categoryEntries = Array.from(byCategory.entries());
    const categoryName = (categoryId: string) =>
      categoryNameById.get(categoryId)?.toLowerCase().trim() || '';

    const priorityCategories = categoryEntries
      .filter(([categoryId]) =>
        priorityCategoryKeywords.some((keyword) => categoryName(categoryId).includes(keyword))
      )
      .sort((a, b) => {
        const aName = categoryName(a[0]);
        const bName = categoryName(b[0]);
        const aIndex = priorityCategoryKeywords.findIndex((keyword) => aName.includes(keyword));
        const bIndex = priorityCategoryKeywords.findIndex((keyword) => bName.includes(keyword));
        return aIndex - bIndex;
      });

    const selected: WardrobeItem[] = [];
    const selectedByCategory = new Map<string, number>();

    const addFromCategory = (categoryId: string, max: number) => {
      const list = byCategory.get(categoryId) || [];
      for (const item of list) {
        if (selected.length >= 5) return;
        const currentCount = selectedByCategory.get(categoryId) || 0;
        if (currentCount >= max) break;
        if (!selected.find((selectedItem) => selectedItem.id === item.id)) {
          selected.push(item);
          selectedByCategory.set(categoryId, currentCount + 1);
        }
      }
    };

    priorityCategories.forEach(([categoryId]) => addFromCategory(categoryId, 2));

    categoryEntries
      .filter(([categoryId]) => !priorityCategories.find(([id]) => id === categoryId))
      .forEach(([categoryId]) => addFromCategory(categoryId, 2));

    if (selected.length < 5) {
      categoryEntries.forEach(([categoryId]) => {
        const list = byCategory.get(categoryId) || [];
        for (const item of list) {
          if (selected.length >= 5) return;
          if (!selected.find((selectedItem) => selectedItem.id === item.id)) {
            selected.push(item);
          }
        }
      });
    }

    return selected.slice(0, 5);
  };

  useEffect(() => {
    const loadWardrobes = async () => {
      if (!user) return;
      setLoading(true);

      const { data: follows } = await supabase
        .from('follows')
        .select('followed_user_id, followed:users!follows_followed_user_id_fkey(id, handle, display_name, avatar_url)')
        .eq('follower_user_id', user.id)
        .eq('status', 'accepted');

      const followedUsers = (follows || [])
        .map((row: any) => row.followed as FollowedUser)
        .filter(Boolean);

      const previewsData = await Promise.all(
        followedUsers.map(async (followed) => {
          const { data: wardrobeItems } = await getUserWardrobeItems(followed.id);
          const { count: outfitCount } = await supabase
            .from('outfits')
            .select('id', { count: 'exact', head: true })
            .eq('owner_user_id', followed.id)
            .eq('archived_at', null);
          const selectedItems = selectPreviewItems(wardrobeItems || []);
          const itemIds = selectedItems.map((item) => item.id);
          const { data: imagesMap } = await getWardrobeItemsImages(itemIds);

          const previewItems = selectedItems.map((item) => {
            const images = imagesMap?.get(item.id) || [];
            let imageUrl: string | null = null;
            if (images.length > 0 && images[0].image?.storage_key) {
              const storageBucket = images[0].image.storage_bucket || 'media';
              const { data: urlData } = supabase.storage
                .from(storageBucket)
                .getPublicUrl(images[0].image.storage_key);
              imageUrl = urlData?.publicUrl || null;
            }
            return { id: item.id, title: item.title, imageUrl };
          });

          return {
            user: followed,
            items: previewItems,
            wardrobeCount: wardrobeItems?.length || 0,
            outfitCount: outfitCount || 0,
          } satisfies WardrobePreview;
        })
      );

      setPreviews(previewsData);
      setLoading(false);
    };

    loadWardrobes();
  }, [user, categoryNameById]);

  const emptyState = useMemo(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No wardrobes yet</Text>
        <Text style={styles.emptySubtitle}>Follow users to see their wardrobes here.</Text>
      </View>
    );
  }, [loading]);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={previews}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={emptyState}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/wardrobe/user/${item.user.id}`)}
            >
              <View style={styles.topRightActions}>
                <TouchableOpacity
                  style={styles.profileLink}
                  onPress={() => router.push(`/users/${item.user.id}`)}
                >
                  {item.user.avatar_url ? (
                    <ExpoImage source={{ uri: item.user.avatar_url }} style={styles.profileAvatar} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={28} color="#111" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.outfitLink}
                  onPress={() => router.push(`/users/${item.user.id}?tab=outfits`)}
                >
                  <Ionicons name="shirt-outline" size={22} color="#111" />
                </TouchableOpacity>
              </View>
              <View style={styles.cardHeader}>
                {item.user.avatar_url ? (
                  <ExpoImage source={{ uri: item.user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
                <View>
                  <Text style={styles.userName}>
                    {item.user.display_name || item.user.handle || 'User'}
                  </Text>
                  {item.user.handle ? (
                    <Text style={styles.userHandle}>@{item.user.handle}</Text>
                  ) : null}
                  <Text style={styles.userCounts}>
                    {item.wardrobeCount} items • {item.outfitCount} outfits
                  </Text>
                </View>
              </View>
              <View style={styles.previewGrid}>
                {item.items.map((previewItem) => (
                  <View key={previewItem.id} style={styles.previewItem}>
                    {previewItem.imageUrl ? (
                      <ExpoImage
                        source={{ uri: previewItem.imageUrl }}
                        style={styles.previewImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.previewImagePlaceholder} />
                    )}
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ededed',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
    position: 'relative',
  },
  topRightActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileLink: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  outfitLink: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e5e5',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  userHandle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  userCounts: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  previewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  previewItem: {
    width: '19%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f3f3',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewImagePlaceholder: {
    flex: 1,
    backgroundColor: '#e5e5e5',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
  },
});

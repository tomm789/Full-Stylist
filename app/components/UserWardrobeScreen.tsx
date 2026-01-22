import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserWardrobeItems,
  getWardrobeItemsImages,
  saveWardrobeItem,
  unsaveWardrobeItem,
  isWardrobeItemSaved,
  WardrobeItem,
} from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

interface UserWardrobeScreenProps {
  userId: string;
}

export default function UserWardrobeScreen({ userId }: UserWardrobeScreenProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [itemImagesCache, setItemImagesCache] = useState<Map<string, string | null>>(new Map());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (userId && typeof userId === 'string') {
      loadWardrobe();
    }
  }, [userId]);

  const loadWardrobe = async () => {
    if (!userId || typeof userId !== 'string') return;

    setLoading(true);
    const { data, error } = await getUserWardrobeItems(userId);

    if (!error && data) {
      setItems(data);

      // Load images for all items
      if (data.length > 0) {
        const itemIds = data.map((item) => item.id);
        const { data: imagesMap } = await getWardrobeItemsImages(itemIds);

        const newCache = new Map<string, string | null>();
        for (const itemId of itemIds) {
          const images = imagesMap.get(itemId);
          if (images && images.length > 0 && images[0].image?.storage_key) {
            const storageBucket = images[0].image.storage_bucket || 'media';
            const { data: urlData } = supabase.storage
              .from(storageBucket)
              .getPublicUrl(images[0].image.storage_key);
            newCache.set(itemId, urlData?.publicUrl || null);
          } else {
            newCache.set(itemId, null);
          }
        }
        setItemImagesCache(newCache);
      }

      // Check which items are saved
      if (user) {
        const savedSet = new Set<string>();
        for (const item of data) {
          const { data: isSaved } = await isWardrobeItemSaved(user.id, item.id);
          if (isSaved) {
            savedSet.add(item.id);
          }
        }
        setSavedItems(savedSet);
      }
    }

    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWardrobe();
    setRefreshing(false);
  };

  const handleSaveItem = async (itemId: string) => {
    if (!user) return;

    setSavingItemId(itemId);
    const isCurrentlySaved = savedItems.has(itemId);

    if (isCurrentlySaved) {
      const { error } = await unsaveWardrobeItem(user.id, itemId);
      if (!error) {
        setSavedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }
    } else {
      const { error } = await saveWardrobeItem(user.id, itemId);
      if (!error) {
        setSavedItems((prev) => new Set(prev).add(itemId));
      }
    }

    setSavingItemId(null);
  };

  const handleItemPress = (itemId: string) => {
    // Navigate to item detail (read-only view)
    router.push(`/wardrobe/item/${itemId}?readOnly=true`);
  };

  const renderItem = ({ item }: { item: WardrobeItem }) => {
    const imageUrl = itemImagesCache.get(item.id) || null;
    const isSaved = savedItems.has(item.id);
    const isSaving = savingItemId === item.id;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleItemPress(item.id)}
      >
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.itemImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.itemImagePlaceholder}>
            <Ionicons name="shirt-outline" size={32} color="#999" />
          </View>
        )}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => handleSaveItem(item.id)}
          disabled={isSaving}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? '#007AFF' : '#fff'}
            />
          )}
        </TouchableOpacity>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading wardrobe...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shirt-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No wardrobe items yet</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.itemsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  itemsList: {
    padding: 8,
  },
  itemCard: {
    flex: 1,
    margin: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 0.75,
  },
  itemImage: {
    width: '100%',
    height: '80%',
    backgroundColor: '#f0f0f0',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '80%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  itemTitle: {
    padding: 8,
    fontSize: 12,
    color: '#000',
    fontWeight: '500',
  },
});

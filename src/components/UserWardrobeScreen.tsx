import React, { useMemo, useState, useEffect } from 'react';
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
import { colors } from '@/styles';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories, useFilters } from '@/hooks/wardrobe';
import { CategoryPills, FilterDrawer, SearchBar } from '@/components/wardrobe';
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
  showSearchControls?: boolean;
  showAddButton?: boolean;
  onGridScroll?: (event: any) => void;
  scrollEventThrottle?: number;
}

export default function UserWardrobeScreen({
  userId,
  showSearchControls = true,
  showAddButton = false,
  onGridScroll,
  scrollEventThrottle,
}: UserWardrobeScreenProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { categories } = useCategories();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [itemImagesCache, setItemImagesCache] = useState<Map<string, string | null>>(new Map());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const categoryOptions = useMemo(() => {
    if (!items.length) return [];
    const usedCategoryIds = new Set(items.map((item) => item.category_id).filter(Boolean));
    return categories.filter((category) => usedCategoryIds.has(category.id));
  }, [categories, items]);

  const baseItems = useMemo(() => {
    let filtered = items;
    if (selectedCategoryId) {
      filtered = filtered.filter((item) => item.category_id === selectedCategoryId);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((item) => {
        const titleMatch = item.title?.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        return Boolean(titleMatch || descriptionMatch);
      });
    }

    return filtered;
  }, [items, searchQuery, selectedCategoryId]);

  const {
    filters,
    filteredItems,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    availableColors,
    availableMaterials,
    availableSizes,
    availableSeasons,
  } = useFilters(baseItems, user?.id ?? null);

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
              color={isSaved ? '#007AFF' : colors.textTertiary}
            />
          )}
        </TouchableOpacity>
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

  const shouldShowEmptyState =
    filteredItems.length === 0;
  const emptyMessage =
    searchQuery || selectedCategoryId || hasActiveFilters
      ? 'No items found'
      : 'No wardrobe items yet';

  return (
    <View style={styles.container}>
      {showSearchControls && (
        <>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFilter={() => setShowFilterDrawer(true)}
            onAdd={showAddButton ? () => router.push('/wardrobe/add') : undefined}
            hasActiveFilters={hasActiveFilters}
            showAdd={showAddButton}
          />
          <CategoryPills
            categories={categoryOptions}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            variant="category"
          />
        </>
      )}

      {shouldShowEmptyState ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shirt-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.itemsList}
          columnWrapperStyle={styles.itemsRow}
          onScroll={onGridScroll}
          scrollEventThrottle={scrollEventThrottle}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {showSearchControls && (
        <FilterDrawer
          visible={showFilterDrawer}
          onClose={() => setShowFilterDrawer(false)}
          filters={filters}
          onUpdateFilter={updateFilter}
          onClearAll={clearFilters}
          availableColors={availableColors}
          availableMaterials={availableMaterials}
          availableSizes={availableSizes}
          availableSeasons={availableSeasons}
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
    padding: 1,
  },
  itemsRow: {
    gap: 1,
  },
  itemCard: {
    flex: 1,
    margin: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
    aspectRatio: 1,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});

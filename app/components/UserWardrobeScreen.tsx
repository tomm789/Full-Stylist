import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserWardrobeItems,
  getWardrobeItemsImages,
  saveWardrobeItem,
  unsaveWardrobeItem,
  isWardrobeItemSaved,
  getWardrobeCategories,
  getSubcategories,
  WardrobeItem,
  WardrobeCategory,
  WardrobeSubcategory,
} from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

interface UserWardrobeScreenProps {
  userId: string;
  headerComponent?: React.ReactNode;
}

interface FilterState {
  subcategoryId: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  season: string | null;
}

export default function UserWardrobeScreen({ userId, headerComponent }: UserWardrobeScreenProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [subcategories, setSubcategories] = useState<WardrobeSubcategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [allItems, setAllItems] = useState<WardrobeItem[]>([]);
  const [itemImagesCache, setItemImagesCache] = useState<Map<string, string | null>>(new Map());
  const [itemOutfitCounts, setItemOutfitCounts] = useState<Map<string, { self: number; others: number }>>(new Map());
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    subcategoryId: null,
    color: null,
    material: null,
    size: null,
    season: null,
  });

  useEffect(() => {
    if (userId && typeof userId === 'string') {
      loadCategories();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (userId && typeof userId === 'string') {
      loadWardrobe();
    }
  }, [userId, selectedCategoryId, searchQuery]);

  const filteredItems = useMemo(() => {
    let filtered = [...allItems];

    if (filters.subcategoryId) {
      filtered = filtered.filter((item) => item.subcategory_id === filters.subcategoryId);
    }

    if (filters.color) {
      const filterColor = filters.color.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.color_primary?.toLowerCase() === filterColor ||
          (item.color_palette &&
            typeof item.color_palette === 'object' &&
            JSON.stringify(item.color_palette).toLowerCase().includes(filterColor))
      );
    }

    if (filters.material) {
      filtered = filtered.filter((item) => {
        if (!item.material) return false;
        const materialStr =
          typeof item.material === 'string'
            ? item.material
            : JSON.stringify(item.material);
        return materialStr.toLowerCase().includes(filters.material!.toLowerCase());
      });
    }

    if (filters.size) {
      filtered = filtered.filter((item) => {
        if (!item.size) return false;
        const sizeStr = typeof item.size === 'string' ? item.size : JSON.stringify(item.size);
        return sizeStr.toLowerCase().includes(filters.size!.toLowerCase());
      });
    }

    if (filters.season) {
      filtered = filtered.filter((item) => {
        if (!item.seasonality) return false;
        const seasonStr =
          typeof item.seasonality === 'string'
            ? item.seasonality
            : JSON.stringify(item.seasonality);
        return seasonStr.toLowerCase().includes(filters.season!.toLowerCase());
      });
    }

    return filtered;
  }, [allItems, filters]);

  useEffect(() => {
    setItems(filteredItems);
  }, [filteredItems]);

  const loadCategories = async () => {
    const { data: categoriesData } = await getWardrobeCategories();
    if (categoriesData) {
      setCategories(categoriesData);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    const { data: subs } = await getSubcategories(categoryId);
    if (subs) {
      setSubcategories(subs);
    }
  };

  const loadWardrobe = async () => {
    if (!userId || typeof userId !== 'string') return;

    setLoading(true);
    const { data, error } = await getUserWardrobeItems(userId, {
      category_id: selectedCategoryId || undefined,
      search: searchQuery || undefined,
    });

    if (!error && data) {
      setAllItems(data);

      if (data.length > 0) {
        const itemIds = data.map((item) => item.id);
        const { data: imagesMap } = await getWardrobeItemsImages(itemIds);
        const ownerByItemId = new Map(data.map((item) => [item.id, item.owner_user_id]));
        const initialCounts = new Map<string, { self: number; others: number }>();
        data.forEach((item) => {
          initialCounts.set(item.id, { self: 0, others: 0 });
        });
        const { data: outfitItems } = await supabase
          .from('outfit_items')
          .select('wardrobe_item_id, outfit:outfit_id(owner_user_id)')
          .in('wardrobe_item_id', itemIds);

        outfitItems?.forEach((row: any) => {
          const counts = initialCounts.get(row.wardrobe_item_id);
          const ownerId = ownerByItemId.get(row.wardrobe_item_id);
          const outfitOwnerId = row.outfit?.owner_user_id;
          if (!counts || !ownerId || !outfitOwnerId) return;
          if (outfitOwnerId === ownerId) {
            counts.self += 1;
          } else {
            counts.others += 1;
          }
        });
        setItemOutfitCounts(initialCounts);

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
      } else {
        setItemImagesCache(new Map());
        setItemOutfitCounts(new Map());
      }

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
    router.push(`/wardrobe/item/${itemId}?readOnly=true`);
  };

  const hasActiveFilters = () => {
    return Boolean(
      filters.subcategoryId ||
        filters.color ||
        filters.material ||
        filters.size ||
        filters.season
    );
  };

  const activeFilterChips = () => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (filters.subcategoryId) {
      const subcategory = subcategories.find((sub) => sub.id === filters.subcategoryId);
      if (subcategory) {
        chips.push({
          key: 'subcategory',
          label: subcategory.name,
          onClear: () => setFilters({ ...filters, subcategoryId: null }),
        });
      }
    }

    if (filters.color) {
      chips.push({
        key: 'color',
        label: `Color: ${filters.color}`,
        onClear: () => setFilters({ ...filters, color: null }),
      });
    }

    if (filters.material) {
      chips.push({
        key: 'material',
        label: `Material: ${filters.material}`,
        onClear: () => setFilters({ ...filters, material: null }),
      });
    }

    if (filters.size) {
      chips.push({
        key: 'size',
        label: `Size: ${filters.size}`,
        onClear: () => setFilters({ ...filters, size: null }),
      });
    }

    if (filters.season) {
      chips.push({
        key: 'season',
        label: `Season: ${filters.season}`,
        onClear: () => setFilters({ ...filters, season: null }),
      });
    }

    return chips;
  };

  const renderCategoryPill = ({ item }: { item: WardrobeCategory }) => {
    const isSelected = selectedCategoryId === item.id;
    return (
      <TouchableOpacity
        style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
        onPress={() => setSelectedCategoryId(isSelected ? null : item.id)}
      >
        <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: WardrobeItem }) => {
    const imageUrl = itemImagesCache.get(item.id) || null;
    const isSaved = savedItems.has(item.id);
    const isSaving = savingItemId === item.id;
    const counts = itemOutfitCounts.get(item.id) || { self: 0, others: 0 };

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
        {user && (
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
        )}
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.itemMetaRow}>
          <Text style={styles.itemMetaText}>Outfits: {counts.self}</Text>
          {counts.others > 0 && (
            <Text style={styles.itemMetaTextSecondary}>By others: {counts.others}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      {headerComponent}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search wardrobe..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
          onPress={() => setShowFilterDrawer(true)}
        >
          <Ionicons
            name="filter"
            size={20}
            color={hasActiveFilters() ? '#fff' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {hasActiveFilters() && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersList}
          >
            {activeFilterChips().map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={styles.activeFilterChip}
                onPress={filter.onClear}
              >
                <Text style={styles.activeFilterText}>{filter.label}</Text>
                <Ionicons name="close" size={14} color="#333" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            data={categories}
            renderItem={renderCategoryPill}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {selectedCategoryId && subcategories.length > 0 && (
        <View style={styles.subcategoriesContainer}>
          <FlatList
            horizontal
            data={subcategories}
            renderItem={({ item }) => {
              const isSelected = filters.subcategoryId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.subcategoryPill, isSelected && styles.subcategoryPillSelected]}
                  onPress={() => {
                    setFilters({
                      ...filters,
                      subcategoryId: isSelected ? null : item.id,
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.subcategoryPillText,
                      isSelected && styles.subcategoryPillTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesList}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.itemsList}
        columnWrapperStyle={styles.itemsRow}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading wardrobe...</Text>
              </>
            ) : (
              <>
                <Ionicons name="shirt-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No wardrobe items yet</Text>
              </>
            )}
          </View>
        }
      />

      <Modal
        visible={showFilterDrawer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterDrawer(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilterDrawer(false)}>
                <Text style={styles.drawerClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerContent}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Color</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g. Black"
                  value={filters.color || ''}
                  onChangeText={(value) => setFilters({ ...filters, color: value || null })}
                />
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Material</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g. Cotton"
                  value={filters.material || ''}
                  onChangeText={(value) => setFilters({ ...filters, material: value || null })}
                />
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Size</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g. M"
                  value={filters.size || ''}
                  onChangeText={(value) => setFilters({ ...filters, size: value || null })}
                />
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Season</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g. Summer"
                  value={filters.season || ''}
                  onChangeText={(value) => setFilters({ ...filters, season: value || null })}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  activeFiltersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  activeFiltersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#333',
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  categoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
  },
  categoryPillSelected: {
    backgroundColor: '#000',
  },
  categoryPillText: {
    fontSize: 12,
    color: '#333',
  },
  categoryPillTextSelected: {
    color: '#fff',
  },
  subcategoriesContainer: {
    backgroundColor: '#fff',
    paddingBottom: 8,
  },
  subcategoriesList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subcategoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f2f2f2',
  },
  subcategoryPillSelected: {
    backgroundColor: '#007AFF',
  },
  subcategoryPillText: {
    fontSize: 12,
    color: '#333',
  },
  subcategoryPillTextSelected: {
    color: '#fff',
  },
  itemsList: {
    paddingBottom: 24,
  },
  itemsRow: {
    paddingHorizontal: 8,
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
    height: '70%',
    backgroundColor: '#f0f0f0',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '70%',
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
  itemMetaRow: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 2,
  },
  itemMetaText: {
    fontSize: 11,
    color: '#666',
  },
  itemMetaTextSecondary: {
    fontSize: 11,
    color: '#999',
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  drawer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  drawerClose: {
    fontSize: 24,
    fontWeight: '600',
  },
  drawerContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
});

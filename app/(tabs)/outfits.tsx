import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOutfitsWithOptions, OutfitWithRating } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { Ionicons } from '@expo/vector-icons';

type SortOption = 'date' | 'rating' | 'title';
type SortOrder = 'asc' | 'desc';

export default function OutfitsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [outfits, setOutfits] = useState<OutfitWithRating[]>([]);
  const [outfitImagesCache, setOutfitImagesCache] = useState<Map<string, string | null>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    if (user) {
      loadOutfits();
    }
  }, [user, sortBy, sortOrder, showFavoritesOnly]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadOutfits();
      }
    }, [user])
  );

  const loadOutfits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await getUserOutfitsWithOptions(user.id, {
        search: searchQuery || undefined,
        favorites: showFavoritesOnly || undefined,
        sortBy,
        sortOrder,
      });

      if (error) {
        console.error('Failed to load outfits:', error);
        return;
      }

      setOutfits(data || []);

      // Load images in parallel
      const imageMap = new Map<string, string | null>();
      const loadPromises = (data || []).map(async (outfit) => {
        const url = await getOutfitCoverImageUrl(outfit);
        imageMap.set(outfit.id, url);
      });
      await Promise.all(loadPromises);
      setOutfitImagesCache(imageMap);
    } catch (error) {
      console.error('Error loading outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter outfits based on search query (client-side for instant feedback)
  useEffect(() => {
    if (searchQuery.trim()) {
      loadOutfits();
    }
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOutfits();
    setRefreshing(false);
  };

  const handleOutfitPress = (outfitId: string) => {
    router.push(`/outfits/${outfitId}/view`);
  };

  const handleSortChange = (newSortBy: SortOption) => {
    setSortBy(newSortBy);
    setShowSortModal(false);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const getSortLabel = () => {
    const labels: Record<SortOption, string> = {
      date: 'Date',
      rating: 'Rating',
      title: 'Title',
    };
    return `${labels[sortBy]} (${sortOrder === 'asc' ? 'Asc' : 'Desc'})`;
  };

  const renderOutfitCard = ({ item }: { item: OutfitWithRating }) => {
    const imageUrl = outfitImagesCache.get(item.id);

    return (
      <TouchableOpacity
        style={styles.outfitCard}
        onPress={() => handleOutfitPress(item.id)}
      >
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.outfitImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.outfitImagePlaceholder}>
            <Text style={styles.outfitImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.outfitInfo}>
          <Text style={styles.outfitTitle} numberOfLines={2}>
            {item.title || 'Untitled Outfit'}
          </Text>
          {item.notes && (
            <Text style={styles.outfitNotes} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
          <View style={styles.outfitMeta}>
            {item.is_favorite && (
              <Ionicons name="heart" size={14} color="#FF3B30" style={styles.metaIcon} />
            )}
            {sortBy === 'rating' && item.rating !== undefined && (
              <Text style={styles.ratingText}>
                ⭐ {item.rating}
              </Text>
            )}
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && outfits.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search outfits..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadOutfits}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterButton, showFavoritesOnly && styles.filterButtonActive]}
          onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Ionicons
            name={showFavoritesOnly ? 'heart' : 'heart-outline'}
            size={16}
            color={showFavoritesOnly ? '#fff' : '#666'}
          />
          <Text
            style={[
              styles.filterButtonText,
              showFavoritesOnly && styles.filterButtonTextActive,
            ]}
          >
            Favorites
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            setShowSortModal(true);
          }}
        >
          <Ionicons name="swap-vertical" size={16} color="#666" />
          <Text style={styles.filterButtonText}>{getSortLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* Outfits List */}
      <FlatList
        data={outfits}
        renderItem={renderOutfitCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || showFavoritesOnly
                ? 'No outfits found'
                : 'No outfits yet'}
            </Text>
            {!searchQuery && !showFavoritesOnly && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/outfits/new')}
              >
                <Text style={styles.emptyButtonText}>Create your first outfit</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {(['date', 'rating', 'title'] as SortOption[]).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortOption,
                    sortBy === option && styles.sortOptionActive,
                  ]}
                  onPress={() => handleSortChange(option)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option && styles.sortOptionTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                  {sortBy === option && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.sortOrderSection}>
                <Text style={styles.sortOrderLabel}>Order</Text>
                <TouchableOpacity
                  style={styles.sortOrderButton}
                  onPress={toggleSortOrder}
                >
                  <Ionicons
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color="#007AFF"
                  />
                  <Text style={styles.sortOrderText}>
                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </Text>
                </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  outfitCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  outfitImagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outfitImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  outfitInfo: {
    padding: 8,
  },
  outfitTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  outfitNotes: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  outfitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaIcon: {
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 'auto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  sortOptionActive: {
    backgroundColor: '#e3f2fd',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sortOrderSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sortOrderLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  sortOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  sortOrderText: {
    fontSize: 16,
    color: '#333',
  },
});

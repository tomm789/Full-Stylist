import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { getActiveListings, ListingWithImages } from '@/lib/listings';
import { supabase } from '@/lib/supabase';
import { Header, HeaderIconButton } from '@/components/shared/layout';

export default function MarketplaceScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<ListingWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    const { data } = await getActiveListings(50, 0);
    if (data) {
      setListings(data);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListings();
    setRefreshing(false);
  };

  const getListingImageUrl = (listing: ListingWithImages): string | null => {
    if (listing.images && listing.images.length > 0 && listing.images[0].image) {
      const { data: urlData } = supabase.storage
        .from(listing.images[0].image.storage_bucket || 'media')
        .getPublicUrl(listing.images[0].image.storage_key);
      return urlData.publicUrl;
    }
    return null;
  };

  const renderListing = ({ item }: { item: ListingWithImages }) => {
    const imageUrl = getListingImageUrl(item);
    const wardrobeItem = item.wardrobe_item;

    return (
      <TouchableOpacity
        style={styles.listingCard}
        onPress={() => router.push(`/marketplace/${item.id}`)}
      >
        {imageUrl ? (
          <ExpoImage source={{ uri: imageUrl }} style={styles.listingImage} contentFit="cover" />
        ) : (
          <View style={styles.listingImagePlaceholder}>
            <Text style={styles.listingImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {wardrobeItem?.title || 'Item'}
          </Text>
          <Text style={styles.listingPrice}>
            {item.currency || 'AUD'} ${item.price.toFixed(2)}
          </Text>
          <Text style={styles.listingCondition}>Condition: {item.condition}</Text>
          {item.seller && (
            <Text style={styles.listingSeller}>
              {item.seller.display_name || item.seller.handle || 'Seller'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && listings.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Marketplace"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
      />

      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active listings yet</Text>
          <Text style={styles.emptySubtext}>Be the first to list an item for sale!</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listingsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  listingsList: {
    padding: 8,
  },
  listingCard: {
    flex: 1,
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  listingImage: {
    width: '100%',
    aspectRatio: 1,
  },
  listingImagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  listingInfo: {
    padding: 12,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  listingCondition: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  listingSeller: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

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
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getUserListings, ListingWithImages, deleteListing } from '@/lib/listings';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';
import { Header, HeaderActionButton } from '@/components/shared/layout';

export default function MyListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listings, setListings] = useState<ListingWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadListings();
    }
  }, [user]);

  const loadListings = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await getUserListings(user.id);
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

  const handleDelete = async (listingId: string) => {
    if (!user) return;

    Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteListing(user.id, listingId);
          if (error) {
            Alert.alert('Error', `Failed to delete: ${error.message || error}`);
          } else {
            await loadListings();
          }
        },
      },
    ]);
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

    return (
      <TouchableOpacity
        style={styles.listingCard}
        onPress={() => router.push(`/listings/${item.id}`)}
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
            {item.wardrobe_item?.title || 'Item'}
          </Text>
          <Text style={styles.listingPrice}>
            {item.currency || 'AUD'} ${item.price.toFixed(2)}
          </Text>
          <Text style={styles.listingStatus}>Status: {item.status}</Text>
          <View style={styles.listingActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(`/listings/${item.id}`)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
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
        title="My Listings"
        leftContent={
          <HeaderActionButton
            label="Back"
            onPress={() => router.back()}
          />
        }
        rightContent={
          <HeaderActionButton
            label="+ New"
            onPress={() => router.push('/listings/new')}
          />
        }
      />

      {listings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No listings yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/listings/new')}
          >
            <Text style={styles.emptyButtonText}>Create your first listing</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item.id}
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
    padding: 16,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  listingImage: {
    width: 120,
    height: 120,
  },
  listingImagePlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  listingInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  listingStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  listingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

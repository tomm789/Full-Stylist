import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
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
import { showErrorToast } from '@/utils/toast';
import { Header, HeaderActionButton, HeaderIconButton } from '@/components/shared/layout';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/screens/listings.styles';

export default function MyListingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            showErrorToast(`Failed to delete: ${error.message || error}`);
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
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="My Listings"
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
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
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={5}
          contentContainerStyle={styles.listingsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

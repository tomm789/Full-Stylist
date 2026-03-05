import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
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
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/screens/marketplace.styles';

export default function MarketplaceScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          initialNumToRender={8}
          maxToRenderPerBatch={4}
          windowSize={5}
          numColumns={2}
          contentContainerStyle={styles.listingsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

/**
 * Explore Screen (Refactored)
 * Discover public outfits from all users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { LoadingSpinner, EmptyState } from '@/components/shared';

interface PublicOutfit {
  id: string;
  title?: string;
  owner_user_id: string;
  user?: {
    display_name: string;
    handle: string;
  };
}

export default function ExploreScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [outfits, setOutfits] = useState<PublicOutfit[]>([]);
  const [images, setImages] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOutfits = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data } = await getPublicOutfits(50, 0);
      if (data) {
        setOutfits(data);

        // Load images in parallel
        const imageCache = new Map<string, string | null>();
        await Promise.all(
          data.map(async (outfit) => {
            const url = await getOutfitCoverImageUrl(outfit);
            imageCache.set(outfit.id, url);
          })
        );
        setImages(imageCache);
      }
    } catch (error) {
      console.error('Error loading public outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOutfits();
    setRefreshing(false);
  };

  useEffect(() => {
    loadOutfits();
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {outfits.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title="No public outfits yet"
          message="Check back later for inspiration"
        />
      ) : (
        <FlatList
          data={outfits}
          numColumns={2}
          renderItem={({ item }) => {
            const imageUrl = images.get(item.id);
            return (
              <TouchableOpacity
                style={styles.outfitCard}
                onPress={() => router.push(`/outfits/${item.id}`)}
              >
                {imageUrl ? (
                  <ExpoImage
                    source={{ uri: imageUrl }}
                    style={styles.outfitImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={styles.imagePlaceholder} />
                )}
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.userName} numberOfLines={1}>
                    {item.user?.display_name || item.user?.handle || 'User'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  grid: {
    padding: 8,
  },
  outfitCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f0f0f0',
  },
  outfitInfo: {
    padding: 12,
  },
  outfitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  userName: {
    fontSize: 12,
    color: '#666',
  },
});

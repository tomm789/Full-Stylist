/**
 * Explore Screen (Refactored)
 * Discover public outfits from all users
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { getPublicOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

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
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
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
    return (
      <View style={commonStyles.loadingContainer}>
        <LoadingSpinner />
      </View>
    );
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
        <PostGrid
          data={outfits}
          renderItem={({ item }) => {
            const imageUrl = images.get(item.id);
            return (
              <TouchableOpacity
                style={postGridStyles.gridItem}
                onPress={() => router.push(`/outfits/${item.id}`)}
              >
                {imageUrl ? (
                  <ExpoImage
                    source={{ uri: imageUrl }}
                    style={postGridStyles.gridImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={postGridStyles.gridImagePlaceholder} />
                )}
                <View style={postGridStyles.infoOverlay}>
                  <Text style={styles.outfitTitle} numberOfLines={1}>
                    {item.title || 'Untitled Outfit'}
                  </Text>
                  <Text style={styles.userName} numberOfLines={1}>
                    @{item.user?.handle || item.user?.display_name || 'user'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  outfitTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textLight,
  },
  userName: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textLight,
  },
});

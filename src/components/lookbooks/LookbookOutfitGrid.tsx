/**
 * LookbookOutfitGrid Component
 * Grid display of outfits in a lookbook
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
import { Ionicons } from '@expo/vector-icons';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { Lookbook } from '@/lib/lookbooks';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';

interface LookbookOutfitGridProps {
  outfits: any[];
  lookbook: Lookbook | null;
  lookbookId: string | string[] | undefined;
  onFavoritePress: (outfitId: string, currentFavoriteStatus: boolean) => void;
  onMenuPress: (outfit: any) => void;
}

export function LookbookOutfitGrid({
  outfits,
  lookbook,
  lookbookId,
  onFavoritePress,
  onMenuPress,
}: LookbookOutfitGridProps) {
  const router = useRouter();

  const OutfitCard = ({ item, index }: { item: any; index: number }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
      getOutfitCoverImageUrl(item).then(setImageUrl);
    }, [item]);

    const handlePress = () => {
      router.push({
        pathname: `/outfits/${item.id}/view`,
        params: {
          lookbookId: lookbookId as string,
          lookbookTitle: lookbook?.title || '',
          outfitIndex: index.toString(),
        },
      });
    };

    const handleFavoritePress = (e: any) => {
      e.stopPropagation();
      onFavoritePress(item.id, item.is_favorite || false);
    };

    const handleMenuPress = (e: any) => {
      e.stopPropagation();
      onMenuPress(item);
    };

    return (
      <TouchableOpacity style={postGridStyles.gridItem} onPress={handlePress}>
        {imageUrl ? (
          <>
            <ExpoImage
              source={{ uri: imageUrl }}
              style={postGridStyles.gridImage}
              contentFit="cover"
            />
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={item.is_favorite ? '#ff0000' : '#fff'}
              />
            </TouchableOpacity>
          </>
        ) : (
          <View style={[postGridStyles.gridImagePlaceholder, styles.outfitImagePlaceholder]}>
            <Text style={styles.outfitImagePlaceholderText}>No Image</Text>
          </View>
        )}
        <View style={[postGridStyles.infoOverlay, styles.outfitOverlay]}>
          <Text style={styles.outfitTitle} numberOfLines={2}>
            {item.title || 'Untitled Outfit'}
          </Text>
          {lookbook?.type.startsWith('custom_') && (
            <TouchableOpacity
              onPress={handleMenuPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (outfits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No outfits in this lookbook yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Outfits</Text>
      <PostGrid
        data={outfits}
        renderItem={({ item, index }) => <OutfitCard item={item} index={index} />}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  favoriteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    padding: 2,
  },
  outfitImagePlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  outfitImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  outfitOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  outfitTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

/**
 * ItemCard Component
 * Displays a single wardrobe item in a grid
 * Memoized for performance
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ImagePlaceholder from '../shared/images/ImagePlaceholder';
import { theme } from '@/styles';
import { WardrobeItem } from '@/lib/wardrobe';

const { colors, spacing, borderRadius, typography } = theme;

interface ItemCardProps {
  item: WardrobeItem;
  imageUrl: string | null;
  imageLoading?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onFavoritePress?: () => void;
  showFavorite?: boolean;
}

function ItemCard({
  item,
  imageUrl,
  imageLoading = false,
  selected = false,
  dimmed = false,
  onPress,
  onLongPress,
  onFavoritePress,
  showFavorite = true,
}: ItemCardProps) {
  const handleFavoritePress = (e: any) => {
    e.stopPropagation();
    onFavoritePress?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        dimmed && styles.cardDimmed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      {imageLoading ? (
        <View style={styles.imagePlaceholder}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : imageUrl ? (
        <>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
          {showFavorite && onFavoritePress && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.is_favorite ? 'heart' : 'heart-outline'}
                size={24}
                color={item.is_favorite ? colors.favorite : colors.white}
              />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <ImagePlaceholder aspectRatio={1} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: colors.primary,
  },
  cardDimmed: {
    opacity: 0.35,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    padding: spacing.xs,
  },
  title: {
    padding: spacing.sm,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
});

// Memoize component to prevent unnecessary re-renders
export default memo(ItemCard, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.imageLoading === nextProps.imageLoading &&
    prevProps.selected === nextProps.selected &&
    prevProps.dimmed === nextProps.dimmed &&
    prevProps.item.is_favorite === nextProps.item.is_favorite
  );
});

/**
 * OutfitCard Component
 * Card for displaying an outfit in grid view
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { OutfitWithRating } from '@/lib/outfits';
import { postGridStyles } from '@/components/social/PostGrid';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

interface OutfitCardProps {
  outfit: OutfitWithRating;
  imageUrl: string | null;
  imageLoading: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  showRating?: boolean;
  style?: ViewStyle;
}

const OutfitCard = React.memo(
  ({
    outfit,
    imageUrl,
    imageLoading,
    onPress,
    onLongPress,
    showRating = false,
    style,
  }: OutfitCardProps) => {
  const colors = useThemeColors();
  const styles = createStyles(colors);
    return (
      <TouchableOpacity
        style={[postGridStyles.gridItem, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        {imageLoading ? (
          <View style={postGridStyles.gridImagePlaceholder}>
            <ActivityIndicator />
          </View>
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={postGridStyles.gridImage} contentFit="cover" />
        ) : (
          <View style={postGridStyles.gridImagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={postGridStyles.infoOverlay}>
          <Text style={styles.title} numberOfLines={1}>
            {outfit.title || 'Untitled Outfit'}
          </Text>
          <View style={styles.meta}>
            {outfit.is_favorite ? (
              <Ionicons name="heart" size={12} color={colors.error} style={styles.metaIcon} />
            ) : null}
            {showRating && outfit.rating !== undefined ? (
              <Text style={styles.rating}>⭐ {outfit.rating}</Text>
            ) : null}
            <Text style={styles.date}>
              {new Date(outfit.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

OutfitCard.displayName = 'OutfitCard';

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  placeholderText: {
    color: colors.gray500,
    fontSize: typography.fontSize.xs,
  },
  title: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    color: colors.textLight,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaIcon: {
    marginRight: spacing.xs / 2,
  },
  rating: {
    fontSize: typography.fontSize.xs,
    color: colors.textLight,
  },
  date: {
    fontSize: 11,
    color: colors.textLight,
    marginLeft: 'auto',
  },
});

export default OutfitCard;

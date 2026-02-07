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
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

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
    return (
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        {imageLoading ? (
          <View style={styles.placeholder}>
            <ActivityIndicator />
          </View>
        ) : imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {outfit.title || 'Untitled Outfit'}
          </Text>

          {outfit.notes ? (
            <Text style={styles.notes} numberOfLines={1}>
              {outfit.notes}
            </Text>
          ) : null}

          <View style={styles.meta}>
            {outfit.is_favorite ? (
              <Ionicons
                name="heart"
                size={14}
                color={colors.error}
                style={styles.metaIcon}
              />
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

const styles = StyleSheet.create({
  card: {
    width: '48%',
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.gray500,
    fontSize: typography.fontSize.xs,
  },
  info: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
    color: colors.textPrimary,
  },
  notes: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
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
    color: colors.textSecondary,
  },
  date: {
    fontSize: 11,
    color: colors.gray500,
    marginLeft: 'auto',
  },
});

export default OutfitCard;

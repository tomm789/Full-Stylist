/**
 * OutfitGridSelector Component
 * Grid of selectable outfit cards
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import { theme } from '@/styles';

const { colors, spacing } = theme;

interface OutfitGridSelectorProps {
  outfits: any[];
  selectedIds: Set<string>;
  imageUrls: Map<string, string | null>;
  onToggle: (outfitId: string) => void;
}

const OutfitCard = React.memo(
  ({
    outfit,
    imageUrl,
    isSelected,
    onToggle,
  }: {
    outfit: any;
    imageUrl: string | null;
    isSelected: boolean;
    onToggle: (id: string) => void;
  }) => {
    return (
      <TouchableOpacity
        style={[postGridStyles.gridItem, styles.card]}
        onPress={() => onToggle(outfit.id)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={postGridStyles.gridImage} contentFit="cover" />
        ) : (
          <View style={[postGridStyles.gridImagePlaceholder, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <View style={postGridStyles.infoOverlay}>
          {isSelected && (
            <View style={postGridStyles.selectionBadge}>
              <Text style={postGridStyles.selectionBadgeText}>✓</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={2}>
            {outfit.title || 'Untitled Outfit'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);

export default function OutfitGridSelector({
  outfits,
  selectedIds,
  imageUrls,
  onToggle,
}: OutfitGridSelectorProps) {
  return (
    <PostGrid
      data={outfits}
      renderItem={({ item }) => (
        <OutfitCard
          outfit={item}
          imageUrl={imageUrls.get(item.id) || null}
          isSelected={selectedIds.has(item.id)}
          onToggle={onToggle}
        />
      )}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  imagePlaceholder: {
    backgroundColor: colors.gray200,
  },
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  title: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

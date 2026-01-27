/**
 * OutfitGridSelector Component
 * Grid of selectable outfit cards
 */

import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '@/styles';

const { colors, spacing, borderRadius } = theme;

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
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => onToggle(outfit.id)}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.overlay}>
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>✓</Text>
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
    <FlatList
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
      numColumns={2}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    margin: spacing.xs / 2,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: colors.primary,
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
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  selectedBadge: {
    position: 'absolute',
    top: -60,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});

/**
 * OutfitGridPicker Component
 * Grid of outfits for selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface OutfitGridPickerProps {
  outfits: any[];
  outfitImages: Map<string, string | null>;
  selectedOutfitId: string | null;
  onSelectOutfit: (outfitId: string | null) => void;
}

export default function OutfitGridPicker({
  outfits,
  outfitImages,
  selectedOutfitId,
  onSelectOutfit,
}: OutfitGridPickerProps) {
  if (outfits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Outfit</Text>
        <Text style={styles.emptyText}>No outfits available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Outfit</Text>
      <FlatList
        data={outfits}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => {
          const imageUrl = outfitImages.get(item.id);
          const isSelected = selectedOutfitId === item.id;

          return (
            <TouchableOpacity
              style={[styles.outfitCard, isSelected && styles.outfitCardSelected]}
              onPress={() => onSelectOutfit(isSelected ? null : item.id)}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.outfitImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.outfitImagePlaceholder}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
              {isSelected && (
                <View style={styles.selectedOverlay}>
                  <Text style={styles.selectedCheck}>✓</Text>
                </View>
              )}
              <Text style={styles.outfitTitle} numberOfLines={1}>
                {item.title || 'Untitled Outfit'}
              </Text>
            </TouchableOpacity>
          );
        }}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg + spacing.md,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm + spacing.xs / 2,
    color: colors.textPrimary,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: spacing.sm,
  },
  outfitCard: {
    flex: 1,
    maxWidth: '31%',
    margin: spacing.xs / 2,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  outfitCardSelected: {
    borderColor: colors.black,
    borderWidth: 3,
  },
  outfitImage: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: colors.gray100,
  },
  outfitImagePlaceholder: {
    width: '100%',
    aspectRatio: 0.75,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  selectedOverlay: {
    position: 'absolute',
    top: spacing.xs / 2,
    right: spacing.xs / 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  outfitTitle: {
    padding: spacing.sm,
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

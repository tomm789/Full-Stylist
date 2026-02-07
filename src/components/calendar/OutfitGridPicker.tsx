/**
 * OutfitGridPicker Component
 * Grid of outfits for selection
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

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
  const colors = useThemeColors();
  const styles = createStyles(colors);
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
      <PostGrid
        data={outfits}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const imageUrl = outfitImages.get(item.id);
          const isSelected = selectedOutfitId === item.id;

          return (
            <TouchableOpacity
              style={[
                postGridStyles.gridItem,
                styles.outfitCard,
              ]}
              onPress={() => onSelectOutfit(isSelected ? null : item.id)}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={postGridStyles.gridImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[postGridStyles.gridImagePlaceholder, styles.outfitImagePlaceholder]}>
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
              {isSelected && (
                <View style={postGridStyles.selectionBadge}>
                  <Text style={postGridStyles.selectionBadgeText}>✓</Text>
                </View>
              )}
              <View style={postGridStyles.infoOverlay}>
                <Text style={styles.outfitTitle} numberOfLines={1}>
                  {item.title || 'Untitled Outfit'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  outfitCard: {
    overflow: 'hidden',
  },
  outfitImagePlaceholder: {
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  outfitTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'left',
  },
});

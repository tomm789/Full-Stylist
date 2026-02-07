/**
 * LookbookCreatorBar Component
 * Bar showing selected outfits for lookbook creation
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder, IconButton } from '@/components/shared';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface SelectedOutfit {
  id: string;
  imageUrl: string | null;
}

interface LookbookCreatorBarProps {
  selectedOutfits: SelectedOutfit[];
  onRemoveOutfit: (outfitId: string) => void;
  onExit: () => void;
}

export default function LookbookCreatorBar({
  selectedOutfits,
  onRemoveOutfit,
  onExit,
}: LookbookCreatorBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Selected outfits</Text>
          <Text style={styles.count}>{selectedOutfits.length}</Text>
        </View>
        <IconButton
          icon="close"
          onPress={onExit}
          size={20}
          color={colors.textPrimary}
        />
      </View>

      <ScrollView
        horizontal
        style={styles.scroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {selectedOutfits.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} contentFit="cover" />
            ) : (
              <View style={styles.itemImagePlaceholder}>
                <ImagePlaceholder text="" iconSize={22} />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveOutfit(item.id)}
            >
              <Ionicons name="close-circle" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  count: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },
  scroll: {
    paddingHorizontal: spacing.md,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  itemCard: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.white,
    borderRadius: 10,
  },
});

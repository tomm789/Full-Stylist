/**
 * CategorySlotSelector Component
 * Displays category slots with selected items for outfit building
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeCategory, WardrobeItem } from '@/lib/wardrobe';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface CategorySlotSelectorProps {
  categories: WardrobeCategory[];
  selectedItems: Map<string, WardrobeItem>;
  itemImageUrls: Map<string, string>;
  onAddItem: (categoryId: string) => void;
  onRemoveItem: (categoryId: string) => void;
}

const getCategoryIcon = (categoryName: string): string => {
  const iconMap: { [key: string]: string } = {
    'Tops': '👕',
    'Bottoms': '👖',
    'Dresses': '👗',
    'Outerwear': '🧥',
    'Shoes': '👟',
    'Accessories': '👜',
    'Jewelry': '💍',
    'Bags': '🎒',
    'Hats': '🎩',
    'Scarves': '🧣',
    'Belts': '📿',
    'Sunglasses': '🕶️',
  };
  return iconMap[categoryName] || '👔';
};

export default function CategorySlotSelector({
  categories,
  selectedItems,
  itemImageUrls,
  onAddItem,
  onRemoveItem,
}: CategorySlotSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Category Slots</Text>
      <Text style={styles.hint}>Select one item per category</Text>

      {categories.map((category) => {
        const selectedItem = selectedItems.get(category.id);
        const itemImageUrl = selectedItem
          ? itemImageUrls.get(selectedItem.id)
          : null;

        return (
          <View key={category.id} style={styles.slot}>
            <View style={styles.slotHeader}>
              <View style={styles.categoryTitle}>
                <Text style={styles.categoryIcon}>
                  {getCategoryIcon(category.name)}
                </Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <View style={styles.actions}>
                {selectedItem && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemoveItem(category.id)}
                  >
                    <Ionicons name="close" size={20} color={colors.white} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddItem(category.id)}
                >
                  <Ionicons name="add" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {selectedItem && (
              <View style={styles.selectedItem}>
                {itemImageUrl && (
                  <Image
                    source={{ uri: itemImageUrl }}
                    style={styles.itemImage}
                    contentFit="cover"
                  />
                )}
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {selectedItem.title}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg + spacing.md,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm + spacing.xs / 2,
  },
  slot: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + spacing.xs / 2,
    marginBottom: spacing.sm + spacing.xs / 2,
    backgroundColor: colors.backgroundSecondary,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs / 2,
    paddingTop: spacing.sm,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  itemTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
});

/**
 * CategorySelector Component
 * Allows selection of items for each category slot
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { WardrobeCategory, WardrobeItem } from '@/lib/wardrobe';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface CategorySelectorProps {
  categories: WardrobeCategory[];
  selectedItems: Map<string, WardrobeItem>;
  itemImages: Map<string, string>;
  onAddItem: (categoryId: string) => void;
  onRemoveItem: (categoryId: string) => void;
  getCategoryIcon?: (categoryName: string) => string;
  style?: ViewStyle;
}

const defaultCategoryIcons: { [key: string]: string } = {
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

export default function CategorySelector({
  categories,
  selectedItems,
  itemImages,
  onAddItem,
  onRemoveItem,
  getCategoryIcon,
  style,
}: CategorySelectorProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const getIcon = getCategoryIcon || ((name: string) => defaultCategoryIcons[name] || '👔');

  return (
    <View style={[styles.container, style]}>
      {categories.map((category) => {
        const selectedItem = selectedItems.get(category.id);
        const itemImageUrl = selectedItem ? itemImages.get(selectedItem.id) : null;

        return (
          <View key={category.id} style={styles.categorySlot}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleRow}>
                <Text style={styles.categoryIcon}>{getIcon(category.name)}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </View>
              <View style={styles.categoryActions}>
                {selectedItem && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemoveItem(category.id)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => onAddItem(category.id)}
                >
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedItem && (
              <View style={styles.selectedItem}>
                {itemImageUrl ? (
                  <Image
                    source={{ uri: itemImageUrl }}
                    style={styles.selectedItemImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.selectedItemImagePlaceholder}>
                    <Ionicons name="image-outline" size={24} color={colors.gray400} />
                  </View>
                )}
                <Text style={styles.selectedItemTitle} numberOfLines={2}>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: spacing.sm + spacing.xs / 2,
  },
  categorySlot: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + spacing.xs / 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryTitleRow: {
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
  categoryActions: {
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
  addButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs / 2,
    paddingTop: spacing.sm,
  },
  selectedItemImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
  },
  selectedItemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedItemTitle: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
});

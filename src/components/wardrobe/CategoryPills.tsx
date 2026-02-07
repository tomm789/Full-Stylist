/**
 * CategoryPills Component
 * Horizontal scrolling category pills for filtering
 */

import React from 'react';
import { View, FlatList, StyleSheet, ViewStyle } from 'react-native';
import { PillButton } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeCategory, WardrobeSubcategory } from '@/lib/wardrobe';

const { spacing } = theme;

interface CategoryPillsProps {
  categories?: WardrobeCategory[];
  subcategories?: WardrobeSubcategory[];
  selectedCategoryId?: string | null;
  selectedSubcategoryId?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
  onSelectSubcategory?: (subcategoryId: string | null) => void;
  variant?: 'category' | 'subcategory';
  style?: ViewStyle;
}

export default function CategoryPills({
  categories = [],
  subcategories = [],
  selectedCategoryId = null,
  selectedSubcategoryId = null,
  onSelectCategory,
  onSelectSubcategory,
  variant = 'category',
  style,
}: CategoryPillsProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const isCategory = variant === 'category';
  const items = isCategory ? categories : subcategories;
  const selectedId = isCategory ? selectedCategoryId : selectedSubcategoryId;
  const onSelect = isCategory ? onSelectCategory : onSelectSubcategory;

  if (items.length === 0) return null;

  const handlePress = (id: string) => {
    if (selectedId === id) {
      // Deselect if already selected
      onSelect?.(null);
    } else {
      onSelect?.(id);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PillButton
            label={item.name}
            selected={selectedId === item.id}
            onPress={() => handlePress(item.id)}
            variant={isCategory ? 'default' : 'primary'}
            size={isCategory ? 'medium' : 'small'}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
});

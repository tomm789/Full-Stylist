/**
 * CategoryPills Component
 * Horizontal scrolling category pills for filtering
 */

import React from 'react';
import { View, FlatList, StyleSheet, ViewStyle, Text } from 'react-native';
import { PillButton } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeCategory, WardrobeSubcategory } from '@/lib/wardrobe';
import WardrobeCategoryIcon from '@/components/shared/WardrobeCategoryIcon';

const { spacing, typography } = theme;

interface CategoryPillsProps {
  categories?: WardrobeCategory[];
  subcategories?: WardrobeSubcategory[];
  selectedCategoryId?: string | null;
  selectedSubcategoryId?: string | null;
  selectedCategoryLabel?: string;
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
  selectedCategoryLabel,
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

  const list = (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PillButton
          label={isCategory ? '' : item.name}
          leading={
            isCategory ? (
              <WardrobeCategoryIcon
                categoryName={item.name}
                size={24}
                color={selectedId === item.id ? colors.white : colors.textSecondary}
              />
            ) : undefined
          }
          selected={selectedId === item.id}
          onPress={() => handlePress(item.id)}
          variant={isCategory ? 'default' : 'primary'}
          size={isCategory ? 'medium' : 'small'}
        />
      )}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  );

  if (!isCategory && selectedCategoryLabel) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.subcategoryRow}>
          <Text style={styles.subcategoryLabel}>{selectedCategoryLabel}</Text>
          <View style={styles.subcategoryList}>{list}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {list}
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
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  subcategoryLabel: {
    paddingLeft: spacing.sm,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  subcategoryList: {
    flex: 1,
  },
});

/**
 * CategoryPills Component
 * Horizontal scrolling category pills with inline expandable subcategories
 */

import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ViewStyle,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeCategory, WardrobeSubcategory } from '@/lib/wardrobe';
import ExpandableCategoryPill from './ExpandableCategoryPill';

const { spacing } = theme;

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEFAULT_CATEGORY_ORDER = [
  'tops',
  'bottoms',
  'dresses',
  'shoes',
  'outerwear',
  'bags',
  'accessories',
  'jumpsuits & rompers',
  'knitwear',
  'activewear',
  'swimwear',
  'jewellery',
  'sleepwear & loungewear',
  'intimates',
];

interface CategoryPillsProps {
  categories?: WardrobeCategory[];
  subcategories?: WardrobeSubcategory[];
  selectedCategoryId?: string | null;
  selectedSubcategoryId?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
  onSelectSubcategory?: (subcategoryId: string | null) => void;
  style?: ViewStyle;
}

export default function CategoryPills({
  categories = [],
  subcategories = [],
  selectedCategoryId = null,
  selectedSubcategoryId = null,
  onSelectCategory,
  onSelectSubcategory,
  style,
}: CategoryPillsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);

  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      const aIndex = DEFAULT_CATEGORY_ORDER.indexOf(a.name.toLowerCase());
      const bIndex = DEFAULT_CATEGORY_ORDER.indexOf(b.name.toLowerCase());
      const aPos = aIndex === -1 ? DEFAULT_CATEGORY_ORDER.length : aIndex;
      const bPos = bIndex === -1 ? DEFAULT_CATEGORY_ORDER.length : bIndex;
      return aPos - bPos;
    });
  }, [categories]);

  // Auto-scroll to the selected category when subcategories load
  useEffect(() => {
    if (selectedCategoryId && subcategories.length > 0) {
      const index = sortedCategories.findIndex(
        (c) => c.id === selectedCategoryId,
      );
      if (index >= 0 && flatListRef.current) {
        // Small delay to let LayoutAnimation settle
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0,
          });
        }, 50);
      }
    }
  }, [selectedCategoryId, subcategories.length, sortedCategories]);

  if (sortedCategories.length === 0) return null;

  const handleSelectCategory = (categoryId: string | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSelectCategory?.(categoryId);
  };

  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={flatListRef}
        horizontal
        data={sortedCategories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpandableCategoryPill
            category={item}
            subcategories={
              item.id === selectedCategoryId ? subcategories : []
            }
            selected={item.id === selectedCategoryId}
            selectedSubcategoryId={selectedSubcategoryId}
            onSelectCategory={handleSelectCategory}
            onSelectSubcategory={onSelectSubcategory ?? (() => {})}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0,
            });
          }, 100);
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.backgroundDark,
    },
    list: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
  });

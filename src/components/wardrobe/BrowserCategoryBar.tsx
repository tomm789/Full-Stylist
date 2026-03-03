import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeCategory, WardrobeSubcategory } from '@/lib/wardrobe';
import PillButton from '@/components/shared/buttons/PillButton';
import WardrobeCategoryIcon from '@/components/shared/WardrobeCategoryIcon';

const { spacing } = theme;

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

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.backgroundDark,
    },
    categoryRow: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      gap: spacing.xs,
    },
    subcategoryRow: {
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
  });

interface BrowserCategoryBarProps {
  categories: WardrobeCategory[];
  subcategories: WardrobeSubcategory[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectSubcategory: (subcategoryId: string | null) => void;
  /** When true, only show the filtered category (not all categories) */
  singleCategoryMode?: boolean;
  style?: ViewStyle;
}

export default function BrowserCategoryBar({
  categories,
  subcategories,
  selectedCategoryId,
  selectedSubcategoryId,
  onSelectCategory,
  onSelectSubcategory,
  singleCategoryMode = false,
  style,
}: BrowserCategoryBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aIndex = DEFAULT_CATEGORY_ORDER.indexOf(a.name.toLowerCase());
      const bIndex = DEFAULT_CATEGORY_ORDER.indexOf(b.name.toLowerCase());
      const aPos = aIndex === -1 ? DEFAULT_CATEGORY_ORDER.length : aIndex;
      const bPos = bIndex === -1 ? DEFAULT_CATEGORY_ORDER.length : bIndex;
      return aPos - bPos;
    });
  }, [categories]);

  const visibleCategories = useMemo(() => {
    if (!singleCategoryMode) {
      return sortedCategories;
    }
    if (!selectedCategoryId) {
      return [];
    }
    return sortedCategories.filter((category) => category.id === selectedCategoryId);
  }, [singleCategoryMode, sortedCategories, selectedCategoryId]);

  const showSubcategories =
    selectedCategoryId !== null && subcategories.length > 0;

  const handleCategoryPress = useCallback((categoryId: string | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSelectCategory(categoryId);
  }, [onSelectCategory]);

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        horizontal
        data={visibleCategories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = singleCategoryMode
            ? true
            : item.id === selectedCategoryId;

          return (
            <PillButton
              leading={
                <WardrobeCategoryIcon
                  categoryName={item.name}
                  size={16}
                  color={isSelected ? colors.white : colors.textSecondary}
                />
              }
              label={item.name}
              layout="horizontal"
              size="small"
              selected={isSelected}
              onPress={() => {
                if (singleCategoryMode) {
                  handleCategoryPress(item.id);
                  return;
                }
                handleCategoryPress(isSelected ? null : item.id);
              }}
            />
          );
        }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      />

      {showSubcategories ? (
        <FlatList
          horizontal
          data={subcategories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedSubcategoryId;
            return (
              <PillButton
                label={item.name}
                layout="horizontal"
                size="small"
                selected={isSelected}
                variant={isSelected ? 'primary' : 'default'}
                onPress={() => onSelectSubcategory(isSelected ? null : item.id)}
              />
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subcategoryRow}
        />
      ) : null}
    </View>
  );
}

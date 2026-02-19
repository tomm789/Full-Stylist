/**
 * ExpandableCategoryPill Component
 * A category pill that expands inline to reveal subcategory pills when selected.
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { PillButton } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';
import { WardrobeCategory, WardrobeSubcategory } from '@/lib/wardrobe';
import WardrobeCategoryIcon from '@/components/shared/WardrobeCategoryIcon';

const { spacing, borderRadius, typography } = theme;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface ExpandableCategoryPillProps {
  category: WardrobeCategory;
  subcategories: WardrobeSubcategory[];
  selected: boolean;
  selectedSubcategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onSelectSubcategory: (subcategoryId: string | null) => void;
}

export default function ExpandableCategoryPill({
  category,
  subcategories,
  selected,
  selectedSubcategoryId,
  onSelectCategory,
  onSelectSubcategory,
}: ExpandableCategoryPillProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const handleCategoryPress = () => {
    if (selected) {
      onSelectCategory(null);
    } else {
      onSelectCategory(category.id);
    }
  };

  const handleSubcategoryPress = (subcategoryId: string) => {
    if (selectedSubcategoryId === subcategoryId) {
      onSelectSubcategory(null);
    } else {
      onSelectSubcategory(subcategoryId);
    }
  };

  const isExpanded = selected && subcategories.length > 0;

  // Collapsed state — matches current vertical PillButton appearance
  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={[styles.collapsedPill, selected && styles.collapsedPillSelected]}
        onPress={handleCategoryPress}
        activeOpacity={0.7}
      >
        <WardrobeCategoryIcon
          categoryName={category.name}
          size={28}
          color={selected ? colors.white : colors.textSecondary}
        />
        <Text
          style={[styles.collapsedLabel, selected && styles.collapsedLabelSelected]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  }

  // Expanded state — horizontal with subcategories inline
  return (
    <View style={styles.expandedPill}>
      <TouchableOpacity
        style={styles.expandedHeader}
        onPress={handleCategoryPress}
        activeOpacity={0.7}
      >
        <WardrobeCategoryIcon
          categoryName={category.name}
          size={20}
          color={colors.white}
        />
        <Text style={styles.expandedLabel} numberOfLines={1}>
          {category.name}
        </Text>
      </TouchableOpacity>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.subcategoryScroll}
      >
        {subcategories.map((sub) => (
          <PillButton
            key={sub.id}
            label={sub.name}
            selected={selectedSubcategoryId === sub.id}
            onPress={() => handleSubcategoryPress(sub.id)}
            variant="primary"
            size="small"
            layout="horizontal"
            style={
              selectedSubcategoryId !== sub.id
                ? styles.subcategoryPillUnselected
                : undefined
            }
            textStyle={
              selectedSubcategoryId !== sub.id
                ? styles.subcategoryTextUnselected
                : undefined
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Collapsed pill — matches PillButton vertical/medium
    collapsedPill: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      gap: 2,
      minWidth: 72,
      maxWidth: 80,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.white,
    },
    collapsedPillSelected: {
      backgroundColor: colors.black,
      borderColor: colors.black,
    },
    collapsedLabel: {
      fontSize: 10,
      textAlign: 'center',
      maxWidth: 68,
      fontWeight: typography.fontWeight.regular,
      color: colors.textSecondary,
    },
    collapsedLabelSelected: {
      color: colors.white,
      fontWeight: typography.fontWeight.semibold,
    },

    // Expanded pill
    expandedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.black,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: colors.black,
      paddingLeft: spacing.sm,
      paddingRight: spacing.xs,
      paddingVertical: spacing.xs,
      gap: spacing.sm,
      maxWidth: SCREEN_WIDTH * 0.85,
    },
    expandedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexShrink: 0,
    },
    expandedLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.semibold,
      color: colors.white,
    },
    subcategoryScroll: {
      gap: spacing.xs,
      paddingRight: spacing.xs,
    },

    // Unselected subcategory pills inside the dark expanded container
    subcategoryPillUnselected: {
      backgroundColor: 'transparent',
      borderColor: 'rgba(255,255,255,0.4)',
    },
    subcategoryTextUnselected: {
      color: colors.white,
      fontWeight: typography.fontWeight.regular,
    },
  });

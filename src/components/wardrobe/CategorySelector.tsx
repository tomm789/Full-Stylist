/**
 * CategorySelector Component
 * Category and subcategory picker for wardrobe items
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { theme } from '@/styles';
import type { ThemeColors } from '@/styles/themeColors';
import {
  WardrobeCategory,
  WardrobeSubcategory,
} from '@/lib/wardrobe';

const { spacing, borderRadius, typography } = theme;

interface CategorySelectorProps {
  categories: WardrobeCategory[];
  selectedCategoryId: string;
  subcategories: WardrobeSubcategory[];
  selectedSubcategoryId: string;
  expanded: boolean;
  subcategoriesExpanded: boolean;
  aiGenerationComplete: boolean;
  onCategorySelect: (categoryId: string) => void;
  onSubcategorySelect: (subcategoryId: string) => void;
  onToggleExpanded: () => void;
  onToggleSubcategoriesExpanded: () => void;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  subcategories,
  selectedSubcategoryId,
  expanded,
  subcategoriesExpanded,
  aiGenerationComplete,
  onCategorySelect,
  onSubcategorySelect,
  onToggleExpanded,
  onToggleSubcategoriesExpanded,
}: CategorySelectorProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!aiGenerationComplete) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>
          Waiting for AI to complete item analysis...
        </Text>
      </View>
    );
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={onToggleExpanded}
      >
        <Text style={styles.label}>
          Category {selectedCategoryId && `(${selectedCategory?.name || ''})`}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.optionsList}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.option,
                selectedCategoryId === category.id && styles.optionSelected,
              ]}
              onPress={() => onCategorySelect(category.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedCategoryId === category.id && styles.optionTextSelected,
                ]}
              >
                {category.name}
              </Text>
              {selectedCategoryId === category.id && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selectedCategoryId && subcategories.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.header}
            onPress={onToggleSubcategoriesExpanded}
          >
            <Text style={styles.label}>
              Subcategory{' '}
              {selectedSubcategoryId &&
                `(${
                  subcategories.find((s) => s.id === selectedSubcategoryId)
                    ?.name || ''
                })`}
            </Text>
            <Ionicons
              name={subcategoriesExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {subcategoriesExpanded && (
            <ScrollView style={styles.optionsList}>
              {subcategories.map((subcategory) => (
                <TouchableOpacity
                  key={subcategory.id}
                  style={[
                    styles.option,
                    selectedSubcategoryId === subcategory.id &&
                      styles.optionSelected,
                  ]}
                  onPress={() => onSubcategorySelect(subcategory.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedSubcategoryId === subcategory.id &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {subcategory.name}
                  </Text>
                  {selectedSubcategoryId === subcategory.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  optionsList: {
    maxHeight: 200,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundTertiary,
  },
  optionSelected: {
    backgroundColor: colors.backgroundSecondary,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  waitingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
    padding: spacing.lg,
    textAlign: 'center',
  },
});

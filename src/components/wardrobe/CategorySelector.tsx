/**
 * CategorySelector Component
 * Category and subcategory picker for wardrobe items
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  WardrobeCategory,
  WardrobeSubcategory,
} from '@/lib/wardrobe';

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
          color="#666"
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
                <Ionicons name="checkmark" size={20} color="#007AFF" />
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
              color="#666"
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
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
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

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  optionsList: {
    maxHeight: 200,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionSelected: {
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    padding: 16,
    textAlign: 'center',
  },
});

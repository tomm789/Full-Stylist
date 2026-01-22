import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { getWardrobeCategories, WardrobeCategory } from '@/lib/wardrobe';

export interface FilterDefinition {
  is_favorite?: boolean;
  category_ids?: string[];
  date_from?: string;
  date_to?: string;
  search_query?: string;
}

interface FilterDefinitionEditorProps {
  onFilterChange: (filterDef: FilterDefinition) => void;
}

export default function FilterDefinitionEditor({ onFilterChange }: FilterDefinitionEditorProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const filterDef: FilterDefinition = {};
    if (isFavorite) {
      filterDef.is_favorite = true;
    }
    if (selectedCategories.size > 0) {
      filterDef.category_ids = Array.from(selectedCategories);
    }
    if (dateFrom) {
      filterDef.date_from = dateFrom;
    }
    if (dateTo) {
      filterDef.date_to = dateTo;
    }
    onFilterChange(filterDef);
  }, [isFavorite, selectedCategories, dateFrom, dateTo]);

  const loadCategories = async () => {
    const { data: cats } = await getWardrobeCategories();
    if (cats) {
      setCategories(cats);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Filter Criteria</Text>
      <Text style={styles.sectionDescription}>
        Outfits matching these criteria will be automatically included in this lookbook.
      </Text>

      {/* Favorite Filter */}
      <View style={styles.filterRow}>
        <View style={styles.filterLabel}>
          <Text style={styles.filterLabelText}>Favorites Only</Text>
          <Text style={styles.filterLabelDescription}>Include only favorited outfits</Text>
        </View>
        <Switch value={isFavorite} onValueChange={setIsFavorite} />
      </View>

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>Categories</Text>
        <Text style={styles.filterSectionDescription}>
          Select categories to include (leave empty for all)
        </Text>
        <View style={styles.categoryPills}>
          {categories.map((category) => {
            const isSelected = selectedCategories.has(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                onPress={() => toggleCategory(category.id)}
              >
                <Text
                  style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Date Range Filter - Placeholder for future enhancement */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>Date Range (Coming Soon)</Text>
        <Text style={styles.filterSectionDescription}>
          Date range filtering will be available in a future update.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterLabel: {
    flex: 1,
  },
  filterLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  filterLabelDescription: {
    fontSize: 12,
    color: '#666',
  },
  filterSection: {
    marginTop: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  filterSectionDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryPillSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#e7f3ff',
  },
  categoryPillText: {
    fontSize: 12,
    color: '#666',
  },
  categoryPillTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

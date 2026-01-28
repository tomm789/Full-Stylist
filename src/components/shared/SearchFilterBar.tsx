/**
 * SearchFilterBar Component
 * Filter chips for search results
 */

import React from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResultType } from '@/hooks/useSearch';

interface SearchFilterBarProps {
  selectedFilter: SearchResultType | 'all';
  onFilterChange: (filter: SearchResultType | 'all') => void;
}

export function SearchFilterBar({
  selectedFilter,
  onFilterChange,
}: SearchFilterBarProps) {
  const filters: Array<{ type: SearchResultType | 'all'; label: string; icon: string }> = [
    { type: 'all', label: 'All', icon: 'grid-outline' },
    { type: 'user', label: 'Users', icon: 'person-outline' },
    { type: 'outfit', label: 'Outfits', icon: 'shirt-outline' },
    { type: 'lookbook', label: 'Lookbooks', icon: 'albums-outline' },
    { type: 'wardrobe_item', label: 'Items', icon: 'pricetag-outline' },
  ];

  return (
    <View style={styles.filterWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map((filter) => {
          const isActive = selectedFilter === filter.type;
          return (
            <TouchableOpacity
              key={filter.type}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => onFilterChange(filter.type)}
            >
              {filter.type !== 'all' && (
                <Ionicons
                  name={filter.icon as any}
                  size={14}
                  color={isActive ? '#fff' : '#666'}
                  style={styles.filterChipIcon}
                />
              )}
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filterWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
});

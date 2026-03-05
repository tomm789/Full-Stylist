/**
 * SearchFilterBar Component
 * Filter chips for search results
 */

import React, { useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResultType } from '@/hooks/search';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, typography } = theme;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  filterWrapper: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipIcon: {
    marginRight: spacing.xs,
  },
  filterChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textLight,
  },
});

interface SearchFilterBarProps {
  selectedFilter: SearchResultType | 'all';
  onFilterChange: (filter: SearchResultType | 'all') => void;
}

export function SearchFilterBar({
  selectedFilter,
  onFilterChange,
}: SearchFilterBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
                  color={isActive ? colors.textLight : colors.textSecondary}
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

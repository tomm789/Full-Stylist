/**
 * SortModal Component
 * Modal for sorting outfits by different criteria
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '@/components/shared';
import { theme } from '@/styles';
import { SortOption, SortOrder } from '@/hooks/outfits';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  sortBy: SortOption;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortOption) => void;
  onOrderToggle: () => void;
  showFavoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
  showGridOutfits?: boolean;
  showGridLookbooks?: boolean;
  onToggleGridOutfits?: () => void;
  onToggleGridLookbooks?: () => void;
  occasionOptions?: string[];
  selectedOccasions?: string[];
  onToggleOccasion?: (occasion: string) => void;
  onClearOccasions?: () => void;
  onResetFilters?: () => void;
}

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'date', label: 'Date' },
  { value: 'rating', label: 'Rating' },
  { value: 'title', label: 'Title' },
];

export default function SortModal({
  visible,
  onClose,
  sortBy,
  sortOrder,
  onSortChange,
  onOrderToggle,
  showFavoritesOnly = false,
  onToggleFavoritesOnly,
  showGridOutfits = true,
  showGridLookbooks = true,
  onToggleGridOutfits,
  onToggleGridLookbooks,
  occasionOptions = [],
  selectedOccasions = [],
  onToggleOccasion,
  onClearOccasions,
  onResetFilters,
}: SortModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { height } = useWindowDimensions();
  const maxBodyHeight = Math.min(height * 0.8, 700);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Sort & Filters"
      headerRight={
        <TouchableOpacity onPress={onResetFilters} disabled={!onResetFilters}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        style={[styles.body, { maxHeight: maxBodyHeight }]}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator
      >
        <TouchableOpacity
          style={[styles.filterRow, styles.savedFilterRow]}
          onPress={onToggleFavoritesOnly}
          disabled={!onToggleFavoritesOnly}
        >
          <Text style={styles.filterText}>Show saved only</Text>
          <Ionicons
            name={showFavoritesOnly ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={showFavoritesOnly ? colors.primary : colors.textTertiary}
          />
        </TouchableOpacity>

        <Text style={styles.sectionHeading}>Sort by</Text>
        {sortOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              sortBy === option.value && styles.optionActive,
            ]}
            onPress={() => onSortChange(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                sortBy === option.value && styles.optionTextActive,
              ]}
            >
              {option.label}
            </Text>
            {sortBy === option.value && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.orderSection}>
          <Text style={styles.orderLabel}>Order</Text>
          <TouchableOpacity style={styles.orderButton} onPress={onOrderToggle}>
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={20}
              color={colors.primary}
            />
            <Text style={styles.orderText}>
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.orderLabel}>Grid Filters</Text>
          <TouchableOpacity
            style={styles.filterRow}
            onPress={onToggleGridOutfits}
            disabled={!onToggleGridOutfits}
          >
            <Text style={styles.filterText}>Show outfits</Text>
            <Ionicons
              name={showGridOutfits ? 'checkbox' : 'square-outline'}
              size={20}
              color={showGridOutfits ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterRow}
            onPress={onToggleGridLookbooks}
            disabled={!onToggleGridLookbooks}
          >
            <Text style={styles.filterText}>Show lookbooks</Text>
            <Ionicons
              name={showGridLookbooks ? 'checkbox' : 'square-outline'}
              size={20}
              color={showGridLookbooks ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.orderLabel}>Occasions</Text>
            {selectedOccasions.length > 0 && (
              <TouchableOpacity onPress={onClearOccasions}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          {occasionOptions.length === 0 ? (
            <Text style={styles.emptyText}>No occasions found</Text>
          ) : (
            occasionOptions.map((occasion) => {
              const selected = selectedOccasions.includes(occasion);
              return (
                <TouchableOpacity
                  key={occasion}
                  style={styles.filterRow}
                  onPress={() => onToggleOccasion?.(occasion)}
                  disabled={!onToggleOccasion}
                >
                  <Text style={styles.filterText}>{occasion}</Text>
                  <Ionicons
                    name={selected ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={selected ? colors.primary : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  resetText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  body: {
    padding: spacing.md,
  },
  bodyContent: {
    paddingBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  optionActive: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  orderSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  filterSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  orderLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.sm,
  },
  orderText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    marginTop: spacing.sm,
  },
  filterText: {
    fontSize: typography.fontSize.base,
    color: colors.textPrimary,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
  },
  savedFilterRow: {
    marginTop: spacing.xs,
  },
});

/**
 * SortModal Component
 * Modal for sorting and filtering outfits — uses shared filter UI components
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import {
  BottomSheet,
  PrimaryButton,
  FilterAccordionSection,
  FilterPillGroup,
} from '@/components/shared';
import { theme } from '@/styles';
import { SortOption, SortOrder } from '@/hooks/outfits';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

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

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['sortBy', 'order'])
  );

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Sort & Filters"
      headerRight={
        <View style={styles.headerActions}>
          <PrimaryButton
            title="Reset"
            onPress={onResetFilters ?? (() => {})}
            variant="outline"
            size="small"
            disabled={!onResetFilters}
          />
          <PrimaryButton
            title="Done"
            onPress={onClose}
            size="small"
          />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Show Saved Only Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show saved only</Text>
            <Switch
              value={showFavoritesOnly}
              onValueChange={() => onToggleFavoritesOnly?.()}
            />
          </View>
        </View>

        {/* Sort By */}
        <FilterAccordionSection
          title="Sort by"
          expanded={expandedSections.has('sortBy')}
          onToggle={() => toggleSection('sortBy')}
        >
          <FilterPillGroup
            label="Sort by"
            pills={sortOptions.map((opt) => ({ id: opt.value, label: opt.label }))}
            selectedId={sortBy}
            onToggle={(id) => {
              if (id) onSortChange(id as SortOption);
            }}
            showAllOption={false}
          />
        </FilterAccordionSection>

        {/* Order */}
        <FilterAccordionSection
          title="Order"
          expanded={expandedSections.has('order')}
          onToggle={() => toggleSection('order')}
        >
          <FilterPillGroup
            label="Order"
            pills={[
              { id: 'asc', label: 'Ascending' },
              { id: 'desc', label: 'Descending' },
            ]}
            selectedId={sortOrder}
            onToggle={(id) => {
              if (id && id !== sortOrder) onOrderToggle();
            }}
            showAllOption={false}
          />
        </FilterAccordionSection>

        {/* Grid Filters */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Grid Filters</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show outfits</Text>
            <Switch
              value={showGridOutfits}
              onValueChange={() => onToggleGridOutfits?.()}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show lookbooks</Text>
            <Switch
              value={showGridLookbooks}
              onValueChange={() => onToggleGridLookbooks?.()}
            />
          </View>
        </View>

        {/* Occasions */}
        {occasionOptions.length > 0 && (
          <FilterAccordionSection
            title={`Occasions${selectedOccasions.length > 0 ? ` (${selectedOccasions.length})` : ''}`}
            expanded={expandedSections.has('occasions')}
            onToggle={() => toggleSection('occasions')}
          >
            <FilterPillGroup
              label="Occasions"
              pills={occasionOptions.map((occ) => ({ id: occ, label: occ }))}
              selectedId={selectedOccasions}
              onToggle={(newSelection) => {
                const newArr = newSelection as unknown as string[];
                if (newArr.length > selectedOccasions.length) {
                  const added = newArr.find((o) => !selectedOccasions.includes(o));
                  if (added) onToggleOccasion?.(added);
                } else {
                  const removed = selectedOccasions.find((o) => !newArr.includes(o));
                  if (removed) onToggleOccasion?.(removed);
                }
              }}
              showAllOption={false}
            />
          </FilterAccordionSection>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  sectionHeading: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
});

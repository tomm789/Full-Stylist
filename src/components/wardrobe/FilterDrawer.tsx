/**
 * FilterDrawer Component
 * Bottom sheet with all filter options for wardrobe
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ThemedBottomSheet, PrimaryButton, FilterPillGroup, FilterAccordionSection } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';
import type { FilterState, AvailableEntityAttribute } from '@/hooks/wardrobe';
import { WardrobeSubcategory } from '@/lib/wardrobe';

const { spacing } = theme;

interface FilterDrawerProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onClearAll: () => void;
  subcategories?: WardrobeSubcategory[];
  availableColors?: string[];
  availableMaterials?: string[];
  availableSizes?: string[];
  availableSeasons?: string[];
  availableBrands?: string[];
  availableConditions?: Array<{ id: string; label: string }>;
  availableEntityAttributes?: AvailableEntityAttribute[];
  availableTags?: Array<{ id: string; name: string }>;
}

export default function FilterDrawer({
  visible,
  onClose,
  filters,
  onUpdateFilter,
  onClearAll,
  subcategories = [],
  availableColors = [],
  availableMaterials = [],
  availableSizes = [],
  availableSeasons = [],
  availableBrands = [],
  availableConditions = [],
  availableEntityAttributes = [],
  availableTags = [],
}: FilterDrawerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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

  const handleApply = () => {
    onClose();
  };

  return (
    <ThemedBottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      headerRight={
        <View style={styles.headerActions}>
          <PrimaryButton
            title="Clear"
            onPress={onClearAll}
            variant="outline"
            size="small"
          />
          <PrimaryButton
            title="Apply"
            onPress={handleApply}
            size="small"
          />
        </View>
      }
    >
      <BottomSheetScrollView showsVerticalScrollIndicator={false}>
        {/* Favorites Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show only favourites</Text>
            <Switch
              value={filters.favorites === true}
              onValueChange={(value) =>
                onUpdateFilter('favorites', value ? true : null)
              }
            />
          </View>
        </View>

        {/* Saved Items Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Show only friends' wardrobes</Text>
            <Switch
              value={filters.showSavedItemsOnly === true}
              onValueChange={(value) =>
                onUpdateFilter('showSavedItemsOnly', value ? true : null)
              }
            />
          </View>
        </View>

        {/* Subcategory Filter */}
        {subcategories.length > 0 && (
          <FilterAccordionSection
            title="Subcategory"
            expanded={expandedSections.has('subcategory')}
            onToggle={() => toggleSection('subcategory')}
          >
            <FilterPillGroup
              label="Subcategory"
              pills={subcategories.map((sub) => ({ id: sub.id, label: sub.name }))}
              selectedId={filters.subcategoryId}
              onToggle={(id) => onUpdateFilter('subcategoryId', id as any)}
            />
          </FilterAccordionSection>
        )}

        {/* Brand Filter */}
        {availableBrands.length > 0 && (
          <FilterAccordionSection
            title="Brand"
            expanded={expandedSections.has('brand')}
            onToggle={() => toggleSection('brand')}
          >
            <FilterPillGroup
              label="Brand"
              pills={availableBrands.map((brand) => ({ id: brand, label: brand }))}
              selectedId={filters.brand}
              onToggle={(id) =>
                onUpdateFilter('brand', filters.brand === id ? null : (id as any))
              }
            />
          </FilterAccordionSection>
        )}

        {/* Condition Filter */}
        {availableConditions.length > 0 && (
          <FilterAccordionSection
            title="Condition"
            expanded={expandedSections.has('condition')}
            onToggle={() => toggleSection('condition')}
          >
            <FilterPillGroup
              label="Condition"
              pills={availableConditions.map((c) => ({ id: c.id, label: c.label }))}
              selectedId={filters.condition}
              onToggle={(id) =>
                onUpdateFilter('condition', filters.condition === id ? null : (id as any))
              }
            />
          </FilterAccordionSection>
        )}

        {/* Color Filter */}
        {availableColors.length > 0 && (
          <FilterAccordionSection
            title="Color"
            expanded={expandedSections.has('color')}
            onToggle={() => toggleSection('color')}
          >
            <FilterPillGroup
              label="Color"
              pills={availableColors.map((color) => ({ id: color, label: color }))}
              selectedId={filters.color}
              onToggle={(id) =>
                onUpdateFilter('color', filters.color === id ? null : (id as any))
              }
            />
          </FilterAccordionSection>
        )}

        {/* Material Filter */}
        {availableMaterials.length > 0 && (
          <FilterAccordionSection
            title="Material"
            expanded={expandedSections.has('material')}
            onToggle={() => toggleSection('material')}
          >
            <FilterPillGroup
              label="Material"
              pills={availableMaterials.map((material) => ({
                id: material,
                label: material,
              }))}
              selectedId={filters.material}
              onToggle={(id) =>
                onUpdateFilter('material', filters.material === id ? null : (id as any))
              }
            />
          </FilterAccordionSection>
        )}

        {/* Size Filter */}
        {availableSizes.length > 0 && (
          <FilterAccordionSection
            title="Size"
            expanded={expandedSections.has('size')}
            onToggle={() => toggleSection('size')}
          >
            <FilterPillGroup
              label="Size"
              pills={availableSizes.map((size) => ({ id: size, label: size }))}
              selectedId={filters.size}
              onToggle={(id) =>
                onUpdateFilter('size', filters.size === id ? null : (id as any))
              }
            />
          </FilterAccordionSection>
        )}

        {/* Season Filter */}
        {availableSeasons.length > 0 && (
          <FilterAccordionSection
            title="Season"
            expanded={expandedSections.has('season')}
            onToggle={() => toggleSection('season')}
          >
            <FilterPillGroup
              label="Season"
              pills={availableSeasons.map((season) => ({ id: season, label: season }))}
              selectedId={filters.season}
              onToggle={(id) =>
                onUpdateFilter('season', filters.season === id ? null : (id as any))
              }
            />
          </FilterAccordionSection>
        )}

        {/* Dynamic Entity Attribute Filters (pattern, style, occasion, formality, etc.) */}
        {availableEntityAttributes.map((attr) => (
          <FilterAccordionSection
            key={attr.key}
            title={attr.name}
            expanded={expandedSections.has(`entity_${attr.key}`)}
            onToggle={() => toggleSection(`entity_${attr.key}`)}
          >
            <FilterPillGroup
              label={attr.name}
              pills={attr.values.map((v) => ({ id: v, label: v }))}
              selectedId={filters.entityAttributes[attr.key] ?? null}
              onToggle={(id) => {
                const current = filters.entityAttributes[attr.key] ?? null;
                const newValue = current === id ? null : id;
                onUpdateFilter('entityAttributes', {
                  ...filters.entityAttributes,
                  [attr.key]: newValue,
                } as any);
              }}
            />
          </FilterAccordionSection>
        ))}

        {/* Tags Filter */}
        {availableTags.length > 0 && (
          <FilterAccordionSection
            title="Tags"
            expanded={expandedSections.has('tags')}
            onToggle={() => toggleSection('tags')}
          >
            <FilterPillGroup
              label="Tags"
              pills={availableTags.map((tag) => ({ id: tag.id, label: tag.name }))}
              selectedId={filters.tagIds}
              onToggle={(newTagIds) => onUpdateFilter('tagIds', newTagIds as any)}
              showAllOption={false}
            />
          </FilterAccordionSection>
        )}
      </BottomSheetScrollView>
    </ThemedBottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

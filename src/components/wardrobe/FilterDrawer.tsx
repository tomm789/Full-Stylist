/**
 * FilterDrawer Component
 * Bottom sheet with all filter options for wardrobe
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { BottomSheet, PillButton, PrimaryButton } from '@/components/shared';
import { theme } from '@/styles';
import { FilterState } from '@/hooks/wardrobe';
import { WardrobeSubcategory } from '@/lib/wardrobe';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

const { colors, spacing, typography } = theme;

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
  availableTags = [],
}: FilterDrawerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => {
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
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footerContent={
        <View style={styles.footer}>
          <PrimaryButton
            title="Clear All"
            onPress={onClearAll}
            variant="outline"
            style={styles.footerButton}
          />
          <PrimaryButton
            title="Apply"
            onPress={handleApply}
            style={styles.footerButton}
          />
        </View>
      }
    >
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
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('subcategory')}
          >
            <Text style={styles.sectionTitle}>Subcategory</Text>
            <Ionicons
              name={expandedSections.has('subcategory') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          {expandedSections.has('subcategory') && (
            <View style={styles.pillsContainer}>
              <PillButton
                label="All"
                selected={filters.subcategoryId === null}
                onPress={() => onUpdateFilter('subcategoryId', null)}
                size="small"
              />
              {subcategories.map((sub) => (
                <PillButton
                  key={sub.id}
                  label={sub.name}
                  selected={filters.subcategoryId === sub.id}
                  onPress={() => onUpdateFilter('subcategoryId', sub.id)}
                  size="small"
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Color Filter */}
      {availableColors.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('color')}
          >
            <Text style={styles.sectionTitle}>Color</Text>
            <Ionicons
              name={expandedSections.has('color') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          {expandedSections.has('color') && (
            <View style={styles.pillsContainer}>
              <PillButton
                label="All"
                selected={filters.color === null}
                onPress={() => onUpdateFilter('color', null)}
                size="small"
              />
              {availableColors.map((color) => (
                <PillButton
                  key={color}
                  label={color}
                  selected={filters.color === color}
                  onPress={() => onUpdateFilter('color', filters.color === color ? null : color)}
                  size="small"
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Material Filter */}
      {availableMaterials.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('material')}
          >
            <Text style={styles.sectionTitle}>Material</Text>
            <Ionicons
              name={expandedSections.has('material') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          {expandedSections.has('material') && (
            <View style={styles.pillsContainer}>
              <PillButton
                label="All"
                selected={filters.material === null}
                onPress={() => onUpdateFilter('material', null)}
                size="small"
              />
              {availableMaterials.map((material) => (
                <PillButton
                  key={material}
                  label={material.length > 20 ? `${material.substring(0, 20)}...` : material}
                  selected={filters.material === material}
                  onPress={() =>
                    onUpdateFilter('material', filters.material === material ? null : material)
                  }
                  size="small"
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Size Filter */}
      {availableSizes.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('size')}
          >
            <Text style={styles.sectionTitle}>Size</Text>
            <Ionicons
              name={expandedSections.has('size') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          {expandedSections.has('size') && (
            <View style={styles.pillsContainer}>
              <PillButton
                label="All"
                selected={filters.size === null}
                onPress={() => onUpdateFilter('size', null)}
                size="small"
              />
              {availableSizes.map((size) => (
                <PillButton
                  key={size}
                  label={size.length > 20 ? `${size.substring(0, 20)}...` : size}
                  selected={filters.size === size}
                  onPress={() =>
                    onUpdateFilter('size', filters.size === size ? null : size)
                  }
                  size="small"
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Season Filter */}
      {availableSeasons.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('season')}
          >
            <Text style={styles.sectionTitle}>Season</Text>
            <Ionicons
              name={expandedSections.has('season') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          {expandedSections.has('season') && (
            <View style={styles.pillsContainer}>
              <PillButton
                label="All"
                selected={filters.season === null}
                onPress={() => onUpdateFilter('season', null)}
                size="small"
              />
              {availableSeasons.map((season) => (
                <PillButton
                  key={season}
                  label={season.length > 20 ? `${season.substring(0, 20)}...` : season}
                  selected={filters.season === season}
                  onPress={() =>
                    onUpdateFilter('season', filters.season === season ? null : season)
                  }
                  size="small"
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => toggleSection('tags')}
          >
            <Text style={styles.sectionTitle}>Tags</Text>
            <Ionicons
              name={expandedSections.has('tags') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          {expandedSections.has('tags') && (
            <View style={styles.pillsContainer}>
              {availableTags.map((tag) => {
                const isSelected = filters.tagIds.includes(tag.id);
                return (
                  <PillButton
                    key={tag.id}
                    label={tag.name}
                    selected={isSelected}
                    onPress={() => {
                      const newTagIds = isSelected
                        ? filters.tagIds.filter((id) => id !== tag.id)
                        : [...filters.tagIds, tag.id];
                      onUpdateFilter('tagIds', newTagIds);
                    }}
                    size="small"
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});

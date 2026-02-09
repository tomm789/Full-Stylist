/**
 * OutfitsHeaderBar Component
 * Pill-style tab selector + view toggle + filters/search for Outfits screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, typography, spacing } from '@/styles';
import { PillButton, SearchBar } from '@/components/shared';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

export type OutfitsTab = 'my_outfits' | 'explore' | 'following' | `lookbook_${string}`;

type PillItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  removable?: boolean;
};

const FIXED_TABS: PillItem[] = [
  { id: 'my_outfits', label: 'My Outfits', icon: 'shirt-outline' },
  { id: 'explore', label: 'Explore', icon: 'compass-outline' },
  { id: 'following', label: 'Following', icon: 'people-outline' },
];

type OutfitsHeaderBarProps = {
  activeTab: OutfitsTab;
  showTabLabels: boolean;
  activeView: 'grid' | 'feed';
  onChangeTab: (tab: OutfitsTab) => void;
  onChangeView: (view: 'grid' | 'feed') => void;
  showViewToggle: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onOpenSort: () => void;
  hasActiveFilters: boolean;
  showSearch: boolean;
  pinnedLookbooks?: { id: string; title: string }[];
  onAddLookbookTab?: () => void;
  onRemoveLookbookTab?: (id: string) => void;
};

export default function OutfitsHeaderBar({
  activeTab,
  showTabLabels,
  activeView,
  onChangeTab,
  onChangeView,
  showViewToggle,
  searchQuery,
  onSearchChange,
  onOpenSort,
  hasActiveFilters,
  showSearch,
  pinnedLookbooks = [],
  onAddLookbookTab,
  onRemoveLookbookTab,
}: OutfitsHeaderBarProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const allPills: PillItem[] = [
    ...FIXED_TABS,
    ...pinnedLookbooks.map((lb) => ({
      id: `lookbook_${lb.id}`,
      label: lb.title,
      icon: 'book-outline' as keyof typeof Ionicons.glyphMap,
      removable: true,
    })),
  ];

  return (
    <View style={styles.container}>
      <View style={styles.pillRow}>
        <FlatList
          horizontal
          data={allPills}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PillButton
              label={item.label}
              icon={item.icon}
              selected={activeTab === item.id}
              onPress={() => onChangeTab(item.id as OutfitsTab)}
              onRemove={
                item.removable && onRemoveLookbookTab
                  ? () => onRemoveLookbookTab(item.id.replace('lookbook_', ''))
                  : undefined
              }
              variant="default"
              size="medium"
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillList}
          style={styles.pillFlatList}
          ListFooterComponent={
            onAddLookbookTab ? (
              <TouchableOpacity style={styles.addButton} onPress={onAddLookbookTab}>
                <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null
          }
        />
      </View>

      {showViewToggle && (
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              activeView === 'grid' && styles.viewToggleButtonActive,
            ]}
            onPress={() => onChangeView('grid')}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={activeView === 'grid' ? colors.textPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewToggleText,
                activeView === 'grid' && styles.viewToggleTextActive,
              ]}
            >
              Grid
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              activeView === 'feed' && styles.viewToggleButtonActive,
            ]}
            onPress={() => onChangeView('feed')}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={activeView === 'feed' ? colors.textPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.viewToggleText,
                activeView === 'feed' && styles.viewToggleTextActive,
              ]}
            >
              Feed
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showSearch && (
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          onFilter={onOpenSort}
          hasActiveFilters={hasActiveFilters}
          showAdd={false}
        />
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  pillRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundDark,
  },
  pillFlatList: {
    flexGrow: 0,
  },
  pillList: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },
  viewToggleButtonActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.background,
  },
  viewToggleText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  viewToggleTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
  },
});

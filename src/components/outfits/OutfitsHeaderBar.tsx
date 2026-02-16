/**
 * OutfitsHeaderBar Component
 * Pill-style tab selector + view toggle + filters/search for Outfits screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, typography, spacing } from '@/styles';
import { SearchBar, TabPillsRow } from '@/components/shared';
import type { TabPillItem } from '@/components/shared/TabPillsRow';
import { OutfitsTabIcon } from '@/components/icons/tabs';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

export type OutfitsTab = 'my_outfits' | 'explore' | 'following' | `lookbook_${string}`;

const FIXED_TABS: TabPillItem[] = [
  {
    id: 'my_outfits',
    label: 'My Outfits',
    icon: 'shirt-outline',
    iconComponent: ({ size, color }) => (
      <OutfitsTabIcon width={size} height={size} color={color} fill={color} />
    ),
  },
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

  const allPills: TabPillItem[] = [
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
      <TabPillsRow
        pills={allPills}
        activeId={activeTab}
        onPress={(id) => onChangeTab(id as OutfitsTab)}
        onRemove={
          onRemoveLookbookTab
            ? (id) => onRemoveLookbookTab(id.replace('lookbook_', ''))
            : undefined
        }
        onAdd={onAddLookbookTab}
        showFilter={false}
      />

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

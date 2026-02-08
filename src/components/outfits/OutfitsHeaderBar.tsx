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

type OutfitsTab = 'my_outfits' | 'explore' | 'following';

const TAB_ITEMS: { id: OutfitsTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
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
}: OutfitsHeaderBarProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <View style={styles.pillRow}>
        <FlatList
          horizontal
          data={TAB_ITEMS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PillButton
              label={item.label}
              icon={item.icon}
              selected={activeTab === item.id}
              onPress={() => onChangeTab(item.id)}
              variant="default"
              size="medium"
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillList}
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
  pillList: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
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

/**
 * OutfitsHeaderBar Component
 * Tab selector + view toggle + filters/search for Outfits screen.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, colors, typography, spacing } from '@/styles';
import { SearchBar } from '@/components/shared';

type OutfitsTab = 'my_outfits' | 'explore' | 'following';

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
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my_outfits' && styles.tabActive]}
          onPress={() => onChangeTab('my_outfits')}
        >
          <Ionicons
            name="shirt-outline"
            size={20}
            color={activeTab === 'my_outfits' ? colors.textPrimary : colors.textTertiary}
          />
          {showTabLabels && (
            <Text style={[styles.tabText, activeTab === 'my_outfits' && styles.tabTextActive]}>
              My Outfits
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'explore' && styles.tabActive]}
          onPress={() => onChangeTab('explore')}
        >
          <Ionicons
            name="compass-outline"
            size={20}
            color={activeTab === 'explore' ? colors.textPrimary : colors.textTertiary}
          />
          {showTabLabels && (
            <Text style={[styles.tabText, activeTab === 'explore' && styles.tabTextActive]}>
              Explore
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => onChangeTab('following')}
        >
          <Ionicons
            name="people-outline"
            size={20}
            color={activeTab === 'following' ? colors.textPrimary : colors.textTertiary}
          />
          {showTabLabels && (
            <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
              Following
            </Text>
          )}
        </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tabBar: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.transparent,
  },
  tabActive: {
    borderBottomColor: colors.textPrimary,
  },
  tabText: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.xs,
    color: colors.textTertiary,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.semibold,
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

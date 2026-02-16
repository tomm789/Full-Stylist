/**
 * SearchHeaderRow
 * Shared header row for Wardrobe/Outfits search.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HeaderSearchPill from '@/components/tabs/HeaderSearchPill';
import type { ThemeColors } from '@/styles/themes';

const { spacing, typography } = theme;

type SearchHeaderRowProps = {
  title: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchToggle: (open: boolean) => void;
  onFilter: () => void;
  hasActiveFilters: boolean;
  placeholder?: string;
  /** Icon shown on the left when search is collapsed (defaults to camera). */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Handler for the left icon tap. */
  onLeftAction?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
  rightBadgeCount?: number;
  searchOpen: boolean;
};

export default function SearchHeaderRow({
  title,
  searchQuery,
  onSearchChange,
  onSearchToggle,
  onFilter,
  hasActiveFilters,
  placeholder = 'Search...',
  leftIcon = 'camera-outline',
  onLeftAction,
  rightIcon,
  onRightAction,
  rightBadgeCount = 0,
  searchOpen,
}: SearchHeaderRowProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {searchOpen ? (
        <TouchableOpacity
          style={styles.leftButton}
          onPress={() => onSearchToggle(false)}
          accessibilityRole="button"
          accessibilityLabel="Close search"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.leftButton}
          onPress={onLeftAction}
          disabled={!onLeftAction}
          accessibilityRole="button"
          accessibilityLabel={leftIcon.replace(/-outline$/, '').replace(/-/g, ' ')}
        >
          <Ionicons
            name={leftIcon}
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
      )}

      {!searchOpen && (
        <Text style={styles.titleText} numberOfLines={1}>
          {title}
        </Text>
      )}

      <View style={[styles.pillWrap, searchOpen && styles.pillWrapExpanded]}>
        <HeaderSearchPill
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onFilter={onFilter}
          hasActiveFilters={hasActiveFilters}
          placeholder={placeholder}
          showFilter
          inlineSearchEnabled
          expanded={searchOpen}
          onToggleExpanded={() => onSearchToggle(!searchOpen)}
          rightIcon={rightIcon}
          onRightAction={onRightAction}
          rightBadgeCount={rightBadgeCount}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  leftButton: {
    padding: spacing.xs,
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  pillWrap: {
    marginLeft: 'auto',
    minWidth: 0,
  },
  pillWrapExpanded: {
    flex: 1,
  },
});

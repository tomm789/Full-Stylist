/**
 * HeaderSearchMenu Component
 * Compact search input + filter icon + add button for header right side.
 * Used on wardrobe and outfits pages.
 *
 * ConnectedHeaderSearchMenu reads from HeaderSearchContext —
 * if a page has registered search state, it shows the search header;
 * otherwise falls back to the default HeaderRightMenu.
 */

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useHeaderSearch } from '@/contexts/HeaderSearchContext';
import { HeaderRightMenu } from './HeaderRightMenu';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface HeaderSearchMenuProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilter: () => void;
  onAdd: () => void;
  hasActiveFilters?: boolean;
  placeholder?: string;
}

export function HeaderSearchMenu({
  searchQuery,
  onSearchChange,
  onFilter,
  onAdd,
  hasActiveFilters = false,
  placeholder = 'Search...',
}: HeaderSearchMenuProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textPlaceholder}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor={colors.textPlaceholder}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <TouchableOpacity
        style={[
          styles.iconButton,
          hasActiveFilters && styles.iconButtonActive,
        ]}
        onPress={onFilter}
      >
        <Ionicons
          name="options-outline"
          size={18}
          color={hasActiveFilters ? colors.white : colors.textSecondary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addButton}
        onPress={onAdd}
      >
        <Ionicons name="add-circle-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Connected version that reads from HeaderSearchContext.
 * Shows HeaderSearchMenu when a page has registered, otherwise HeaderRightMenu.
 */
export function ConnectedHeaderSearchMenu() {
  const { headerSearch } = useHeaderSearch();

  if (!headerSearch) {
    return <HeaderRightMenu />;
  }

  return (
    <HeaderSearchMenu
      searchQuery={headerSearch.searchQuery}
      onSearchChange={headerSearch.onSearchChange}
      onFilter={headerSearch.onFilter}
      onAdd={headerSearch.onAdd}
      hasActiveFilters={headerSearch.hasActiveFilters}
      placeholder={headerSearch.placeholder}
    />
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    height: 34,
    minWidth: 120,
    flex: 1,
    maxWidth: 200,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  iconButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  addButton: {
    padding: spacing.xs,
  },
});

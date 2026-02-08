/**
 * HeaderSearchMenu Component
 * Compact search input + filter icon + add button for wardrobe/outfits headers.
 *
 * Split into two connected components for native header layout:
 * - ConnectedHeaderSearchTitle  → headerTitle (search input + filter icon, centred)
 * - ConnectedHeaderSearchRight  → headerRight (add button only)
 *
 * Legacy ConnectedHeaderSearchMenu is kept for backwards compat but
 * new code should use the split pair above.
 */

import React from 'react';
import {
  View,
  Text,
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

// ---------------------------------------------------------------------------
// Full combined component (search + filter + add in one row)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Split components for native header (title = centre, right = right)
// ---------------------------------------------------------------------------

interface ConnectedHeaderSearchTitleProps {
  fallbackTitle: string;
}

/**
 * For headerTitle — renders the page title followed by a centred search input
 * and filter icon. Falls back to just the title text when no page has
 * registered search state.
 */
export function ConnectedHeaderSearchTitle({ fallbackTitle }: ConnectedHeaderSearchTitleProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { headerSearch } = useHeaderSearch();

  if (!headerSearch) {
    return (
      <View style={styles.titleFallback}>
        <Text style={styles.titleText}>{fallbackTitle}</Text>
      </View>
    );
  }

  return (
    <View style={styles.titleContainer}>
      <Text style={styles.titleText}>{fallbackTitle}</Text>
      <View style={styles.searchInputContainer}>
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textPlaceholder}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={headerSearch.placeholder ?? 'Search...'}
          value={headerSearch.searchQuery}
          onChangeText={headerSearch.onSearchChange}
          placeholderTextColor={colors.textPlaceholder}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      <TouchableOpacity
        style={[
          styles.iconButton,
          headerSearch.hasActiveFilters && styles.iconButtonActive,
        ]}
        onPress={headerSearch.onFilter}
      >
        <Ionicons
          name="options-outline"
          size={18}
          color={headerSearch.hasActiveFilters ? colors.white : colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

/**
 * For headerRight — renders just the add button when search state is
 * registered, otherwise falls back to the default HeaderRightMenu.
 */
export function ConnectedHeaderSearchRight() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { headerSearch } = useHeaderSearch();

  if (!headerSearch) {
    return <HeaderRightMenu />;
  }

  return (
    <View style={styles.rightContainer}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={headerSearch.onAdd}
      >
        <Ionicons name="add-circle-outline" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  /* Full combined row (legacy) */
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.sm,
  },

  /* Title area (split) */
  titleFallback: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },

  /* Right area (split) */
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },

  /* Shared */
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

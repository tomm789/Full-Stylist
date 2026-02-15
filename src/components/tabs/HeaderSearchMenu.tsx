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
import { useCalendarPanel } from '@/contexts/CalendarPanelContext';
import { HeaderRightMenu } from './HeaderRightMenu';
import HeaderIconButton from '@/components/shared/layout/HeaderIconButton';
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

/**
 * For headerTitle — renders calendar icon + wide centred search input + filter icon.
 * Layout: [calendar] [══ search ══] [filter]
 * Calendar icon toggles the left-sliding calendar panel; switches to
 * a back-chevron when the calendar is open.
 */
export function ConnectedHeaderSearchTitle() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { headerSearch } = useHeaderSearch();
  const { showCalendar, toggleCalendar } = useCalendarPanel();

  return (
    <View style={styles.titleContainer}>
      <TouchableOpacity
        style={styles.calendarButton}
        onPress={toggleCalendar}
      >
        <Ionicons
          name={showCalendar ? 'chevron-back' : 'calendar-outline'}
          size={22}
          color={showCalendar ? colors.primary : colors.textPrimary}
        />
      </TouchableOpacity>
      <View style={styles.searchInputContainerWide}>
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textPlaceholder}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={headerSearch?.placeholder ?? 'Search...'}
          value={headerSearch?.searchQuery ?? ''}
          onChangeText={headerSearch?.onSearchChange}
          placeholderTextColor={colors.textPlaceholder}
          autoCapitalize="none"
          returnKeyType="search"
          editable={!!headerSearch}
        />
      </View>
      <TouchableOpacity
        style={[
          styles.iconButton,
          headerSearch?.hasActiveFilters && styles.iconButtonActive,
        ]}
        onPress={headerSearch?.onFilter}
        disabled={!headerSearch}
      >
        <Ionicons
          name="options-outline"
          size={18}
          color={headerSearch?.hasActiveFilters ? colors.white : colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

/**
 * For headerRight — renders the page-specific action icon when search state
 * is registered, otherwise falls back to the default HeaderRightMenu.
 * Uses the shared HeaderIconButton for consistent styling across all pages.
 */
export function ConnectedHeaderSearchRight() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const { headerSearch } = useHeaderSearch();

  if (!headerSearch || !headerSearch.rightActionIcon) {
    return <HeaderRightMenu />;
  }

  const iconName = headerSearch.rightActionIcon as keyof typeof Ionicons.glyphMap;

  return (
    <View style={styles.rightContainer}>
      <HeaderIconButton
        icon={iconName}
        onPress={headerSearch.onRightAction ?? (() => {})}
        accessibilityLabel={headerSearch.rightActionIcon}
      />
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

  /* Title area (split) — filter + wide search */
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
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
  searchInputContainerWide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.sm,
    height: 34,
    flex: 1,
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
  calendarButton: {
    padding: spacing.xs,
  },
});

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

import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useHeaderSearch } from '@/contexts/HeaderSearchContext';
import { HeaderRightMenu } from './HeaderRightMenu';
import HeaderIconButton from '@/components/shared/layout/HeaderIconButton';
import HeaderTitleRow from './HeaderTitleRow';
import HeaderSearchPill from './HeaderSearchPill';
import type { ThemeColors } from '@/styles/themes';
import { usePathname } from 'expo-router';
import { useNotifications } from '@/contexts/NotificationsContext';

const { spacing } = theme;

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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <HeaderSearchPill
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onFilter={onFilter}
        hasActiveFilters={hasActiveFilters}
        placeholder={placeholder}
        expanded={isSearchExpanded}
        onToggleExpanded={() => setIsSearchExpanded((prev) => !prev)}
      />

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
  const { getHeaderSearch, headerSearchVersion } = useHeaderSearch();
  const pathname = usePathname();
  const headerSearch = getHeaderSearch(pathname);
  void headerSearchVersion;

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
 * Calendar icon opens the calendar page.
 */
export function ConnectedHeaderSearchTitle() {
  const { getHeaderSearch, headerSearchVersion } = useHeaderSearch();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const transition = useState(new Animated.Value(1))[0];
  const headerSearch = getHeaderSearch(pathname);
  void headerSearchVersion;
  const fallbackTitle =
    pathname?.includes('/wardrobe')
      ? 'Wardrobe'
      : pathname?.includes('/outfits')
        ? 'Outfits'
        : '';

  useEffect(() => {
    if (!headerSearch || headerSearch.inlineSearchEnabled === false) {
      if (isSearchExpanded) {
        headerSearch?.onSearchToggle?.(false);
      }
      setIsSearchExpanded(false);
    }
  }, [headerSearch, isSearchExpanded]);

  useEffect(() => {
    transition.setValue(0);
    Animated.timing(transition, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [pathname, transition]);

  return (
    <Animated.View
      style={{
        opacity: transition,
        transform: [
          {
            translateY: transition.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 0],
            }),
          },
        ],
      }}
    >
      {headerSearch && isSearchExpanded ? (
        <View style={styles.expandedRow}>
          <TouchableOpacity
            onPress={() => {
              headerSearch.onSearchToggle?.(false);
              setIsSearchExpanded(false);
            }}
            style={styles.expandedBackButton}
            accessibilityLabel="Close search"
          >
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.expandedPillWrap}>
            <HeaderSearchPill
              searchQuery={headerSearch.searchQuery}
              onSearchChange={headerSearch.onSearchChange}
              onSearchPress={headerSearch.onSearchPress}
              onFilter={headerSearch.onFilter}
              hasActiveFilters={headerSearch.hasActiveFilters}
              placeholder={headerSearch.placeholder}
              showFilter={headerSearch.showFilter !== false}
              inlineSearchEnabled={headerSearch.inlineSearchEnabled}
              expanded={isSearchExpanded}
              onToggleExpanded={() =>
                setIsSearchExpanded((prev) => {
                  const next = !prev;
                  headerSearch.onSearchToggle?.(next);
                  return next;
                })
              }
              rightIcon={
                headerSearch.rightActionInPill === false
                  ? undefined
                  : (headerSearch.rightActionIcon as any)
              }
              onRightAction={headerSearch.onRightAction}
              rightBadgeCount={
                headerSearch.rightActionIcon === 'notifications-outline'
                  ? unreadCount
                  : 0
              }
            />
          </View>
        </View>
      ) : (
        <HeaderTitleRow
          title={headerSearch?.title ?? fallbackTitle}
          hideCalendar={isSearchExpanded}
          rightSlot={
            headerSearch ? (
              <HeaderSearchPill
                searchQuery={headerSearch.searchQuery}
                onSearchChange={headerSearch.onSearchChange}
                onSearchPress={headerSearch.onSearchPress}
                onFilter={headerSearch.onFilter}
                hasActiveFilters={headerSearch.hasActiveFilters}
                placeholder={headerSearch.placeholder}
                showFilter={headerSearch.showFilter !== false}
                inlineSearchEnabled={headerSearch.inlineSearchEnabled}
                expanded={isSearchExpanded}
                onToggleExpanded={() =>
                  setIsSearchExpanded((prev) => {
                    const next = !prev;
                    headerSearch.onSearchToggle?.(next);
                    return next;
                  })
                }
                rightIcon={
                  headerSearch.rightActionInPill === false
                    ? undefined
                    : (headerSearch.rightActionIcon as any)
                }
                onRightAction={headerSearch.onRightAction}
                rightBadgeCount={
                  headerSearch.rightActionIcon === 'notifications-outline'
                    ? unreadCount
                    : 0
                }
              />
            ) : null
          }
        />
      )}
    </Animated.View>
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
  const { getHeaderSearch, headerSearchVersion } = useHeaderSearch();
  const pathname = usePathname();
  const headerSearch = getHeaderSearch(pathname);
  void headerSearchVersion;

  if (!headerSearch || !headerSearch.rightActionIcon) {
    return <HeaderRightMenu />;
  }

  if (headerSearch.rightActionInPill) {
    return null;
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

  /* Right area (split) */
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  expandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  expandedBackButton: {
    padding: spacing.xs,
  },
  expandedPillWrap: {
    flex: 1,
    minWidth: 0,
  },
  addButton: {
    padding: spacing.xs,
  },
});

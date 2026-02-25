/**
 * HeaderSearchPill Component
 * Search + filter icons inside a single pill with expandable search field.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import HeaderAvatarButton from '@/components/shared/layout/HeaderAvatarButton';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

const SEARCH_EXPAND_DURATION_MS = 180;

type HeaderSearchPillProps = {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchPress?: () => void;
  onFilter: () => void;
  hasActiveFilters?: boolean;
  placeholder?: string;
  showFilter?: boolean;
  inlineSearchEnabled?: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
  rightBadgeCount?: number;
  avatarUri?: string | null;
  avatarInitials?: string;
  onProfile?: () => void;
};

export default function HeaderSearchPill({
  searchQuery,
  onSearchChange,
  onSearchPress,
  onFilter,
  hasActiveFilters = false,
  placeholder = 'Search...',
  showFilter = true,
  inlineSearchEnabled = true,
  expanded,
  onToggleExpanded,
  rightIcon,
  onRightAction,
  rightBadgeCount = 0,
  avatarUri,
  avatarInitials,
  onProfile,
}: HeaderSearchPillProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const inputRef = useRef<TextInput>(null);
  const widthAnim = useRef(new Animated.Value(expanded && inlineSearchEnabled ? 1 : 0)).current;

  useEffect(() => {
    if (!inlineSearchEnabled) {
      widthAnim.setValue(0);
      return;
    }
    const animation = Animated.timing(widthAnim, {
      toValue: expanded ? 1 : 0,
      duration: SEARCH_EXPAND_DURATION_MS,
      useNativeDriver: false,
    });

    animation.start(() => {
      if (expanded) {
        inputRef.current?.focus();
      }
    });

    // Cleanup: Stop animation on unmount or when dependencies change
    return () => {
      animation.stop();
    };
  }, [expanded, inlineSearchEnabled]);

  // Separate effect for animation listener cleanup
  useEffect(() => {
    return () => {
      widthAnim.stopAnimation();
      widthAnim.removeAllListeners();
    };
  }, [widthAnim]);

  const searchFieldStyle = useMemo(
    () => ({
      flexGrow: widthAnim,
      flexShrink: 1,
      opacity: widthAnim,
      marginLeft: widthAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, spacing.xs],
      }),
      marginRight: widthAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, spacing.xs],
      }),
    }),
    [widthAnim]
  );

  const filterButtonStyle = useMemo(() => {
    if (!inlineSearchEnabled) {
      return { width: 34 };
    }
    return {
      width: widthAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [34, 68],
      }),
    };
  }, [inlineSearchEnabled, widthAnim]);

  const handleSearchPress = inlineSearchEnabled ? onToggleExpanded : (onSearchPress ?? onToggleExpanded);
  const searchLabel = inlineSearchEnabled ? (expanded ? 'Close search' : 'Open search') : 'Open search';

  return (
    <View style={[styles.container, expanded && styles.containerExpanded]}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleSearchPress}
        accessibilityLabel={searchLabel}
      >
        <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      {inlineSearchEnabled && (
        <Animated.View style={[styles.searchField, searchFieldStyle]}>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={placeholder}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholderTextColor={colors.textPlaceholder}
            autoCapitalize="none"
            returnKeyType="search"
            editable={expanded}
          />
        </Animated.View>
      )}
      {showFilter && (
        <Animated.View style={[filterButtonStyle, expanded && styles.filterButtonExpanded]}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}
            onPress={onFilter}
            accessibilityLabel="Filters"
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={hasActiveFilters ? colors.textLight : colors.textSecondary}
            />
          </TouchableOpacity>
        </Animated.View>
      )}
      {!expanded && onProfile != null ? (
        <HeaderAvatarButton
          uri={avatarUri ?? undefined}
          initials={avatarInitials}
          onPress={onProfile}
          inline
          borderless
        />
      ) : !expanded && rightIcon ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onRightAction}
          accessibilityLabel={rightIcon}
        >
          <Ionicons name={rightIcon} size={22} color={colors.textPrimary} />
          {rightBadgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {rightBadgeCount > 99 ? '99+' : rightBadgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.xs,
    height: 34,
  },
  containerExpanded: {
    flexGrow: 1,
    alignSelf: 'stretch',
    minWidth: 0,
  },
  iconButton: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButton: {
    width: '100%',
  },
  filterButtonExpanded: {
    marginLeft: 'auto',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: borderRadius.round,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.textLight,
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
  },
  searchField: {
    overflow: 'hidden',
    height: 26,
    justifyContent: 'center',
    flexBasis: 0,
  },
  searchInput: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
});

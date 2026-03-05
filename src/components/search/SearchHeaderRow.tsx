/**
 * SearchHeaderRow
 * Shared header row for Wardrobe/Outfits with left-side search icon.
 *
 * Collapsed: [LeftIcon] [🔍] [---CenterSlot---] [RightSlot]
 * Expanded:  [←] [🔍] [---Search input (with optional ✕)---]
 *
 * Back arrow closes search + dismisses keyboard.
 * ✕ inside the field only appears when there is text, and clears the query.
 */

import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HeaderAvatarButton from '@/components/shared/layout/HeaderAvatarButton';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, typography, borderRadius } = theme;

const EXPAND_DURATION_MS = 200;

type SearchHeaderRowProps = {
  title: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchToggle: (open: boolean) => void;
  searchOpen: boolean;
  placeholder?: string;
  /** Icon shown on the left (defaults to camera). */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Handler for the left icon tap. */
  onLeftAction?: () => void;
  /** When provided, renders in the center and hides the title. */
  centerSlot?: React.ReactNode;
  /** Icon for the right slot (e.g. notifications). Mutually exclusive with avatar props. */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
  rightBadgeCount?: number;
  /** Avatar for the right slot (wardrobe). Mutually exclusive with rightIcon. */
  avatarUri?: string | null;
  avatarInitials?: string;
  onProfile?: () => void;
};

export default function SearchHeaderRow({
  title,
  searchQuery,
  onSearchChange,
  onSearchToggle,
  searchOpen,
  placeholder = 'Search...',
  leftIcon = 'camera-outline',
  onLeftAction,
  centerSlot,
  rightIcon,
  onRightAction,
  rightBadgeCount = 0,
  avatarUri,
  avatarInitials,
  onProfile,
}: SearchHeaderRowProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const anim = useRef(new Animated.Value(searchOpen ? 1 : 0)).current;

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: searchOpen ? 1 : 0,
      duration: EXPAND_DURATION_MS,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished && searchOpen) {
        inputRef.current?.focus();
      }
    });
    return () => {
      animation.stop();
    };
  }, [anim, searchOpen]);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();
    onSearchToggle(false);
  }, [onSearchToggle]);

  const centerAnimStyle = useMemo(
    () => ({
      opacity: anim.interpolate({
        inputRange: [0, 0.3],
        outputRange: [1, 0],
        extrapolate: 'clamp' as const,
      }),
      // Avoid flex: 0 on native — RN sets flexBasis: auto at exactly 0,
      // which snaps the center slot back to its intrinsic content width.
      flex: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.001] }),
      overflow: 'hidden' as const,
    }),
    [anim],
  );

  const rightSlotAnimStyle = useMemo(
    () => ({
      opacity: anim.interpolate({
        inputRange: [0, 0.3],
        outputRange: [1, 0],
        extrapolate: 'clamp' as const,
      }),
      width: anim.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }),
      overflow: 'hidden' as const,
    }),
    [anim],
  );

  const inputAnimStyle = useMemo(
    () => ({
      // Avoid flex: 0 on native — same flexBasis: auto issue as center slot.
      flex: anim.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }),
      opacity: anim.interpolate({
        inputRange: [0, 0.5],
        outputRange: [0, 1],
        extrapolate: 'clamp' as const,
      }),
    }),
    [anim],
  );

  const hasAvatar = avatarUri != null || avatarInitials != null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      {/* Left icon — swaps between leftIcon and back arrow */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={searchOpen ? handleBack : onLeftAction}
        disabled={!searchOpen && !onLeftAction}
        accessibilityRole="button"
        accessibilityLabel={
          searchOpen
            ? 'Close search'
            : leftIcon.replace(/-outline$/, '').replace(/-/g, ' ')
        }
      >
        <Ionicons
          name={searchOpen ? 'chevron-back' : leftIcon}
          size={22}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      {/* Search icon — always visible, toggles search */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => onSearchToggle(!searchOpen)}
        accessibilityRole="button"
        accessibilityLabel={searchOpen ? 'Close search' : 'Open search'}
      >
        <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Animated search input — grows to fill remaining space */}
      <Animated.View style={[styles.inputWrap, inputAnimStyle]}>
        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          blurOnSubmit
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchChange('')}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Center slot (tab pills) — fades out when search expands */}
      <Animated.View style={[styles.centerSlot, centerAnimStyle]}>
        {centerSlot ?? (
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        )}
      </Animated.View>

      {/* Right slot (avatar or icon) — fades out when search expands */}
      <Animated.View style={rightSlotAnimStyle}>
        {hasAvatar && onProfile ? (
          <HeaderAvatarButton
            uri={avatarUri ?? undefined}
            initials={avatarInitials}
            onPress={onProfile}
            inline
          />
        ) : rightIcon && onRightAction ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onRightAction}
            accessibilityRole="button"
            accessibilityLabel={rightIcon.replace(/-outline$/, '').replace(/-/g, ' ')}
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
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
    },
    iconButton: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerSlot: {
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 0,
    },
    titleText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    inputWrap: {
      height: 34,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: borderRadius.round,
      paddingLeft: spacing.sm,
      paddingRight: spacing.xs,
      backgroundColor: colors.backgroundSecondary,
      minWidth: 0,
      flexBasis: 0,
    },
    searchInput: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      paddingVertical: 0,
    },
    clearButton: {
      padding: spacing.xs,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
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
  });

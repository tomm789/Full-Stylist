/**
 * Shared styles for dropdown menu items (DropdownMenuModal children).
 * Matches HeaderRightMenu / HeaderAddMenu menu item styling.
 *
 * Use `createDropdownMenuStyles(colors)` for theme-aware glass readability.
 * The static `dropdownMenuStyles` is kept for backward compat.
 */

import { StyleSheet } from 'react-native';
import type { ThemeColors } from '@/styles/themes';

export const createDropdownMenuStyles = (colors: ThemeColors) => StyleSheet.create({
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  menuItemTextDanger: {
    color: '#ff3b30',
  },
});

/**
 * Static fallback with glass-friendly colors.
 * Prefer createDropdownMenuStyles(colors) for full theme-aware use.
 * Divider uses semi-transparent gray that works on both light and dark glass.
 */
export const dropdownMenuStyles = StyleSheet.create({
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.85)',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginVertical: 4,
  },
  menuItemTextDanger: {
    color: '#ff3b30',
  },
});

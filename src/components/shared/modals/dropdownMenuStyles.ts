/**
 * Shared styles for dropdown menu items (DropdownMenuModal children).
 * Matches HeaderRightMenu / HeaderAddMenu menu item styling.
 */

import { StyleSheet } from 'react-native';

export const dropdownMenuStyles = StyleSheet.create({
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    color: '#000',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  menuItemTextDanger: {
    color: '#ff3b30',
  },
});

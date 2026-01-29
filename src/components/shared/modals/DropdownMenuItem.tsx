/**
 * Single menu item for use inside DropdownMenuModal.
 * Icon (left) + label; optional danger styling.
 */

import React from 'react';
import { TouchableOpacity, Text, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dropdownMenuStyles } from './dropdownMenuStyles';

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface DropdownMenuItemProps {
  label: string;
  icon: IoniconsName;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  iconColor?: string;
}

export function DropdownMenuItem({
  label,
  icon,
  onPress,
  danger = false,
  disabled = false,
  iconColor,
}: DropdownMenuItemProps) {
  const color = iconColor ?? (danger ? '#ff3b30' : '#000');
  const textStyle: TextStyle[] = [
    dropdownMenuStyles.menuItemText,
    danger && dropdownMenuStyles.menuItemTextDanger,
  ];

  return (
    <TouchableOpacity
      style={dropdownMenuStyles.menuItem}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Single menu item for use inside DropdownMenuModal.
 * Icon (left) + label; optional danger styling.
 */

import React, { useMemo } from 'react';
import { TouchableOpacity, Text, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createDropdownMenuStyles } from './dropdownMenuStyles';

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
  const colors = useThemeColors();
  const menuStyles = useMemo(() => createDropdownMenuStyles(colors), [colors]);
  const color = iconColor ?? (danger ? '#ff3b30' : colors.textPrimary);
  const textStyle: TextStyle[] = [
    menuStyles.menuItemText,
    danger && menuStyles.menuItemTextDanger,
  ];

  return (
    <TouchableOpacity
      style={menuStyles.menuItem}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
}

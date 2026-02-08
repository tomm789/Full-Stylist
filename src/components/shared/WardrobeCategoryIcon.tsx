import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { wardrobeCategoryIconComponents } from '@/lib/icons/wardrobeCategoryIcons';
import type { SvgProps } from 'react-native-svg';

interface WardrobeCategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
}

const fallbackIcon = '👔';

export default function WardrobeCategoryIcon({
  categoryName,
  size = 20,
  color,
}: WardrobeCategoryIconProps) {
  const colors = useThemeColors();
  const Icon = wardrobeCategoryIconComponents[categoryName] as React.ComponentType<SvgProps> | undefined;
  const iconColor = color ?? colors.textPrimary;

  if (!Icon) {
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size }]}> 
        <Text style={[styles.fallbackText, { fontSize: size * 0.9, color: iconColor }]}> 
          {fallbackIcon}
        </Text>
      </View>
    );
  }

  return <Icon width={size} height={size} color={iconColor} />;
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    textAlign: 'center',
  },
});

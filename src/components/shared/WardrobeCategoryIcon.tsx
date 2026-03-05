import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { wardrobeCategoryIconComponents } from '@/lib/wardrobe/categoryIcons';
import type { SvgProps } from 'react-native-svg';

interface WardrobeCategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
}

const fallbackIcon = '👔';

const normalize = (s: string) => s.toLowerCase().replace(/[&\s]+/g, ' ').trim();

const normalizedIconMap = Object.entries(wardrobeCategoryIconComponents).reduce<
  Record<string, React.ComponentType<SvgProps>>
>((acc, [key, component]) => {
  acc[normalize(key)] = component as React.ComponentType<SvgProps>;
  return acc;
}, {});

export default function WardrobeCategoryIcon({
  categoryName,
  size = 20,
  color,
}: WardrobeCategoryIconProps) {
  const colors = useThemeColors();
  const Icon = normalizedIconMap[normalize(categoryName)];
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

  return <Icon width={size} height={size} fill={iconColor} color={iconColor} />;
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

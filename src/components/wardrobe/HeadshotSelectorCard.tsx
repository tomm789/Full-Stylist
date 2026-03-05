/**
 * HeadshotSelectorCard Component
 * Displays current body shot thumbnail in outfit creator
 * Tappable to open headshot selector modal
 */

import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder } from '@/components/shared';
import { GRID_IMAGE_PROPS } from '@/lib/images';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';

const { spacing, borderRadius, shadows } = theme;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      backgroundColor: colors.backgroundSecondary,
      ...shadows.sm,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.backgroundTertiary,
    },
  });

interface HeadshotSelectorCardProps {
  headshotUrl: string | null;
  onSelect: () => void;
}

export default function HeadshotSelectorCard({
  headshotUrl,
  onSelect,
}: HeadshotSelectorCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onSelect}
      activeOpacity={0.7}
      hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
    >
      {headshotUrl ? (
        <Image
          {...GRID_IMAGE_PROPS}
          source={{ uri: headshotUrl }}
          style={styles.image}
          recyclingKey={headshotUrl}
        />
      ) : (
        <View style={styles.placeholder}>
          <Ionicons
            name="camera-outline"
            size={28}
            color={colors.textSecondary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

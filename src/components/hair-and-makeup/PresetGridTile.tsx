/**
 * PresetGridTile
 * Single tile in the hair/makeup preset grid.
 * Handles selected state, title display, and info button.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/hairAndMakeupStyles';

const INFO_ICON_SIZE = 16;

type PresetGridTileProps = {
  title: string;
  isSelected: boolean;
  onPress: () => void;
  onInfoPress: () => void;
};

export default function PresetGridTile({
  title,
  isSelected,
  onPress,
  onInfoPress,
}: PresetGridTileProps) {
  const colors = useThemeColors();
  const styles = StyleSheet.create(createStyles(colors));

  return (
    <TouchableOpacity
      style={[styles.presetGridTile, isSelected && styles.presetGridTileSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.presetGridTileTitleArea}>
        <Text
          numberOfLines={2}
          style={[
            styles.presetGridTileText,
            isSelected && styles.presetGridTileTextSelected,
          ]}
        >
          {title}
        </Text>
      </View>
      <View style={styles.presetGridTileInfoRow}>
        <TouchableOpacity
          style={styles.presetGridTileInfoButton}
          onPress={(event) => {
            event.stopPropagation?.();
            onInfoPress();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="information-circle-outline"
            size={INFO_ICON_SIZE}
            color={isSelected ? colors.textLight : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

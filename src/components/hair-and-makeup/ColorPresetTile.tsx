/**
 * ColorPresetTile
 * Variant of PresetGridTile for hair-colour presets.
 * Renders solid or dual-angled background from HAIR_COLOR_SWATCHES,
 * and auto-selects light/dark text based on perceived luminance.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import { needsLightTextOnColor } from '@/lib/headshot/hairColors';

const INFO_ICON_SIZE = 16;

type ColorPresetTileProps = {
  title: string;
  isSelected: boolean;
  /** Single hex string or [primary, secondary] tuple for dual-color tiles. */
  swatch: string | string[] | undefined;
  onPress: () => void;
  onInfoPress: () => void;
};

export default function ColorPresetTile({
  title,
  isSelected,
  swatch,
  onPress,
  onInfoPress,
}: ColorPresetTileProps) {
  const colors = useThemeColors();
  const styles = StyleSheet.create(createStyles(colors));

  const isDualColor = Array.isArray(swatch);
  const needsLightText = swatch
    ? needsLightTextOnColor(isDualColor ? (swatch as string[])[0] : (swatch as string))
    : false;

  return (
    <TouchableOpacity
      style={[
        styles.colorPillGridTile,
        swatch && !isDualColor && { backgroundColor: swatch as string },
        isSelected && styles.colorPillSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {isDualColor && (
        <View style={[styles.colorPillDualBg, { backgroundColor: (swatch as string[])[1] }]}>
          <View style={[styles.colorPillDualLeft, { backgroundColor: (swatch as string[])[0] }]} />
        </View>
      )}
      <View style={styles.colorPillGridTileTitleArea}>
        <Text
          numberOfLines={2}
          style={[
            styles.colorPillText,
            (needsLightText || isSelected) && styles.colorPillTextLight,
            { textAlign: 'center' },
          ]}
        >
          {title}
        </Text>
      </View>
      <View style={styles.colorPillGridTileInfoRow}>
        <TouchableOpacity
          style={styles.colorPillGridTileInfoButton}
          onPress={(event) => {
            event.stopPropagation?.();
            onInfoPress();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="information-circle-outline"
            size={INFO_ICON_SIZE}
            color={(needsLightText || isSelected) ? 'rgba(255,255,255,0.7)' : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

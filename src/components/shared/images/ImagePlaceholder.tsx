/**
 * ImagePlaceholder Component
 * Reusable placeholder for images that haven't loaded or don't exist
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, commonStyles } from '@/styles';

const { colors, typography } = theme;

interface ImagePlaceholderProps {
  text?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  style?: ViewStyle;
  aspectRatio?: number;
}

export default function ImagePlaceholder({
  text = 'No Image',
  icon = 'image-outline',
  iconSize = 48,
  style,
  aspectRatio = 1,
}: ImagePlaceholderProps) {
  return (
    <View
      style={[
        commonStyles.imagePlaceholder,
        { aspectRatio },
        styles.container,
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={colors.gray400} />
      {text && <Text style={commonStyles.imagePlaceholderText}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});

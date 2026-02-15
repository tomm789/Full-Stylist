/**
 * Search Modal Placeholder
 * Future: slide-down search surface anchored to the header search pill.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

export default function SearchModalPlaceholder() {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return <View style={styles.container} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

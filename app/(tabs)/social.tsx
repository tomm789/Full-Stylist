/**
 * Social Feed Screen
 * Intentionally blank for now
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

export default function SocialScreen() {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return <View style={styles.container} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
});

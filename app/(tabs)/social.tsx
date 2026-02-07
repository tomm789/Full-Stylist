/**
 * Social Feed Screen
 * Intentionally blank for now
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/styles';

export default function SocialScreen() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
});

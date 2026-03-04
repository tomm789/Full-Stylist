/**
 * GlassView — Shared glass surface component
 * Wraps expo-blur BlurView with accessibility fallback
 */

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '@/contexts/ThemeContext';

interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export default function GlassView({
  children,
  style,
  intensity = 40,
  tint = 'light',
}: GlassViewProps) {
  const colors = useThemeColors();
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
      const subscription = AccessibilityInfo.addEventListener(
        'reduceTransparencyChanged',
        setReduceTransparency,
      );
      return () => subscription.remove();
    }
  }, []);

  if (reduceTransparency) {
    return (
      <View style={[styles.base, { backgroundColor: colors.background }, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[styles.base, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

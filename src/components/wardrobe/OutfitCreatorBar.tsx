/**
 * OutfitCreatorBar Component
 * Bottom pill-style bar with generate button and options menu
 * Replaces the floating tab bar when outfit creator mode is active
 */

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, IconButton } from '@/components/shared';
import { theme, shadows } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface OutfitCreatorBarProps {
  itemCount: number;
  onGenerate: () => void;
  onOptions: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  isGenerating?: boolean;
}

export default function OutfitCreatorBar({
  itemCount,
  onGenerate,
  onOptions,
  expanded,
  onToggleExpanded,
  isGenerating = false,
}: OutfitCreatorBarProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      <View style={styles.inner}>
        {/* Generate Button */}
        <TouchableOpacity
          style={styles.generateButton}
          onPress={onGenerate}
          disabled={isGenerating}
          activeOpacity={0.7}
        >
          <Ionicons
            name="sparkles"
            size={18}
            color={colors.white}
            style={styles.generateIcon}
          />
          <Text style={styles.generateText} numberOfLines={1}>
            Generate ({itemCount})
          </Text>
        </TouchableOpacity>

        {/* Options Button */}
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={onToggleExpanded}
          disabled={isGenerating}
          activeOpacity={0.7}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons
            name={expanded ? 'contract-outline' : 'expand-outline'}
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionsButton}
          onPress={onOptions}
          disabled={isGenerating}
          activeOpacity={0.7}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    ...shadows.lg,
  },
  inner: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  generateIcon: {
    marginRight: spacing.xs,
  },
  generateText: {
    color: colors.white,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  optionsButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

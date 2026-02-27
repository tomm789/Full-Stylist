/**
 * CreatorBar Component
 * Bottom pill-style bar with generate button and optional options menu.
 * Replaces the floating tab bar when creator mode is active.
 * Used by both outfit creator (wardrobe) and headshot creator (hair & makeup).
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadows } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

interface CreatorBarProps {
  label: string;
  onGenerate: () => void;
  onOptions?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  showOptionsButton?: boolean;
  icon?: string;
  bottomOffset?: number;
}

export default function CreatorBar({
  label,
  onGenerate,
  onOptions,
  isGenerating = false,
  disabled = false,
  showOptionsButton = true,
  icon = 'sparkles',
  bottomOffset = 0,
}: CreatorBarProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const isDisabled = isGenerating || disabled;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  return (
    <Animated.View style={[styles.container, { bottom: spacing.xl + bottomOffset, opacity: opacityAnim }, isDisabled && styles.containerDisabled]}>
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={onGenerate}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          <Ionicons
            name={icon as any}
            size={18}
            color={colors.white}
            style={styles.generateIcon}
          />
          <Text style={styles.generateText} numberOfLines={1}>
            {label}
          </Text>
        </TouchableOpacity>

        {showOptionsButton && onOptions && (
          <TouchableOpacity
            style={styles.optionsButton}
            onPress={onOptions}
            disabled={isDisabled}
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={colors.white}
            />
          </TouchableOpacity>
        )}
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
  containerDisabled: {
    opacity: 0.5,
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

/**
 * HeadshotCreatorContainer Component
 * Displays selected hair/makeup presets and custom descriptions as
 * horizontally scrollable text pills with remove (X) buttons.
 * Positioned above the CreatorBar when headshot creator mode is active.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius, typography } = theme;

export interface SelectionPill {
  id: string;
  label: string;
  type: 'hair' | 'makeup' | 'custom';
}

interface HeadshotCreatorContainerProps {
  selections: SelectionPill[];
  onRemoveSelection: (id: string) => void;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xl + 60 + spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs,
  },
  pillLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    maxWidth: 160,
  },
  removeButton: {
    padding: spacing.xs / 2,
  },
});

export default function HeadshotCreatorContainer({
  selections,
  onRemoveSelection,
}: HeadshotCreatorContainerProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
      >
        {selections.map((selection) => (
          <View key={selection.id} style={styles.pill}>
            <Text style={styles.pillLabel} numberOfLines={1}>
              {selection.label}
            </Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => onRemoveSelection(selection.id)}
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

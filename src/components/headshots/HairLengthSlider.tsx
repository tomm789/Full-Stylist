/**
 * HairLengthSlider
 * Discrete slider for selecting hair length from the hair-length preset options.
 * Renders a horizontal track with tappable tick marks and labels.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themeColors';
import { theme } from '@/styles';

const { spacing, typography, borderRadius } = theme;

export type HairLengthOption = {
  id: string;
  title: string;
};

type HairLengthSliderProps = {
  options: HairLengthOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Short labels for the tick marks to keep the slider compact. */
const SHORT_LABELS: Record<string, string> = {
  'length-buzz': 'Buzz',
  'length-ear': 'Ear',
  'length-chin': 'Chin',
  'length-shoulder': 'Shoulder',
  'length-collarbone': 'Collar',
  'length-mid-back': 'Mid-Back',
  'length-waist': 'Waist',
  'length-hip': 'Hip+',
};

export default function HairLengthSlider({
  options,
  selectedId,
  onSelect,
}: HairLengthSliderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedIndex = selectedId
    ? options.findIndex((o) => o.id === selectedId)
    : -1;

  return (
    <View style={styles.container}>
      <View style={styles.trackRow}>
        {options.map((option, index) => {
          const isSelected = option.id === selectedId;
          const isFilled = selectedIndex >= 0 && index <= selectedIndex;

          return (
            <React.Fragment key={option.id}>
              {/* Segment between ticks */}
              {index > 0 && (
                <View
                  style={[
                    styles.segment,
                    isFilled && styles.segmentFilled,
                  ]}
                />
              )}
              {/* Tick mark */}
              <TouchableOpacity
                style={[
                  styles.tick,
                  isFilled && styles.tickFilled,
                  isSelected && styles.tickSelected,
                ]}
                onPress={() => onSelect(option.id)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              />
            </React.Fragment>
          );
        })}
      </View>
      {/* Labels row */}
      <View style={styles.labelsRow}>
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <TouchableOpacity
              key={option.id}
              style={styles.labelWrapper}
              onPress={() => onSelect(option.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            >
              <Text
                style={[
                  styles.label,
                  isSelected && styles.labelSelected,
                ]}
                numberOfLines={1}
              >
                {SHORT_LABELS[option.id] ?? option.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const TICK_SIZE = 14;
const TICK_SELECTED_SIZE = 18;
const TRACK_HEIGHT = 3;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    trackRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: TICK_SELECTED_SIZE,
    },
    segment: {
      flex: 1,
      height: TRACK_HEIGHT,
      backgroundColor: colors.borderLight,
      borderRadius: TRACK_HEIGHT / 2,
    },
    segmentFilled: {
      backgroundColor: colors.primary,
    },
    tick: {
      width: TICK_SIZE,
      height: TICK_SIZE,
      borderRadius: TICK_SIZE / 2,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 2,
      borderColor: colors.borderLight,
    },
    tickFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    tickSelected: {
      width: TICK_SELECTED_SIZE,
      height: TICK_SELECTED_SIZE,
      borderRadius: TICK_SELECTED_SIZE / 2,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    labelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    labelWrapper: {
      alignItems: 'center',
      width: TICK_SELECTED_SIZE + spacing.md,
    },
    label: {
      fontSize: 9,
      color: colors.textTertiary,
      textAlign: 'center',
    },
    labelSelected: {
      color: colors.primary,
      fontWeight: typography.fontWeight.semibold,
    },
  });

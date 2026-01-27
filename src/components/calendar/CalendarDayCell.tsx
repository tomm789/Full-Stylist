/**
 * CalendarDayCell Component
 * Individual day cell with outfit preview
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CalendarEntry } from '@/lib/calendar';
import { theme } from '@/styles';

const { colors, spacing, borderRadius, typography } = theme;

interface CalendarDayCellProps {
  date: Date;
  entries: CalendarEntry[];
  outfitImages: Map<string, string | null>;
  inCurrentMonth: boolean;
  isToday: boolean;
  onPress: () => void;
}

export default function CalendarDayCell({
  date,
  entries,
  outfitImages,
  inCurrentMonth,
  isToday,
  onPress,
}: CalendarDayCellProps) {
  const outfitEntries = entries.filter((e) => e.outfit_id);
  const firstEntry = outfitEntries[0];
  const imageUrl = firstEntry?.outfit_id ? outfitImages.get(firstEntry.outfit_id) : null;

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        !inCurrentMonth && styles.dayCellOtherMonth,
        isToday && styles.dayCellToday,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.dayNumber,
          !inCurrentMonth && styles.dayNumberOtherMonth,
          isToday && styles.dayNumberToday,
        ]}
      >
        {date.getDate()}
      </Text>

      {outfitEntries.length > 0 && (
        <View style={styles.outfitImagesContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.outfitImage} contentFit="cover" />
          ) : (
            <View style={styles.outfitImagePlaceholder} />
          )}

          {outfitEntries.length > 1 && (
            <View style={styles.moreIndicator}>
              <Text style={styles.moreIndicatorText}>+{outfitEntries.length - 1}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  dayCell: {
    width: `${100 / 7}%`,
    height: 120,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs / 2,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  dayCellOtherMonth: {
    backgroundColor: colors.gray50,
  },
  dayCellToday: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayNumberOtherMonth: {
    color: colors.textTertiary,
  },
  dayNumberToday: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  outfitImagesContainer: {
    flex: 1,
    width: '100%',
    marginTop: 2,
    position: 'relative',
    borderRadius: spacing.xs / 2,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  outfitImage: {
    width: '100%',
    height: '100%',
  },
  outfitImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
  },
  moreIndicator: {
    position: 'absolute',
    bottom: spacing.xs / 2,
    right: spacing.xs / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: spacing.sm,
    paddingHorizontal: spacing.xs + spacing.xs / 2,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  moreIndicatorText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
});

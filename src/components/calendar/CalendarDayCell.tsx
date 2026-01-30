/**
 * CalendarDayCell Component
 * Individual day cell with outfit preview
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CalendarEntry } from '@/lib/calendar';
import { theme as importedTheme } from '@/styles';

interface CalendarDayCellProps {
  date: Date;
  entries: CalendarEntry[];
  outfitImages: Map<string, string | null>;
  inCurrentMonth: boolean;
  isToday: boolean;
  onPress: () => void;
}

function getThemeSafe() {
  // Fallbacks prevent hard crash if theme export is temporarily undefined
  const t: any = importedTheme ?? {};
  const colors = t.colors ?? {
    border: '#E5E7EB',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    primaryLight: '#EEF2FF',
    primary: '#4F46E5',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    white: '#FFFFFF',
  };
  const spacing = t.spacing ?? { xs: 8, sm: 12, md: 16, lg: 24 };
  return { colors, spacing };
}

export default function CalendarDayCell({
  date,
  entries,
  outfitImages,
  inCurrentMonth,
  isToday,
  onPress,
}: CalendarDayCellProps) {
  const { colors, spacing } = useMemo(() => getThemeSafe(), []);

  const outfitEntries = entries.filter((e) => e.outfit_id);
  const firstEntry = outfitEntries[0];
  const imageUrl =
    firstEntry?.outfit_id ? outfitImages?.get(firstEntry.outfit_id) ?? null : null;

  const styles = useMemo(() => {
    return StyleSheet.create({
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
  }, [colors, spacing]);

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        !inCurrentMonth && styles.dayCellOtherMonth,
        isToday && styles.dayCellToday,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        pointerEvents="none"
        style={[
          styles.dayNumber,
          !inCurrentMonth && styles.dayNumberOtherMonth,
          isToday && styles.dayNumberToday,
        ]}
      >
        {date.getDate()}
      </Text>

      {outfitEntries.length > 0 && (
        <View pointerEvents="none" style={styles.outfitImagesContainer}>
          {imageUrl ? (
            <Image
              pointerEvents="none"
              source={{ uri: imageUrl }}
              style={styles.outfitImage}
              contentFit="cover"
            />
          ) : (
            <View pointerEvents="none" style={styles.outfitImagePlaceholder} />
          )}

          {outfitEntries.length > 1 && (
            <View pointerEvents="none" style={styles.moreIndicator}>
              <Text pointerEvents="none" style={styles.moreIndicatorText}>
                +{outfitEntries.length - 1}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}
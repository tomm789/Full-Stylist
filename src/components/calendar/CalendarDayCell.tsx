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
    const cellPad = spacing.xs / 2;

    return StyleSheet.create({
      dayCell: {
        width: `${100 / 7}%`,
        height: 120,
        borderWidth: 1,
        borderColor: colors.border,
        padding: cellPad,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        overflow: 'hidden',
        position: 'relative', // IMPORTANT: lets us layer image + overlays
      },
      dayCellOtherMonth: {
        backgroundColor: colors.gray50,
      },
      dayCellToday: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
        borderWidth: 2,
      },

      // Date (keep original styling)
      dayNumber: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
      },
      dayNumberOtherMonth: {
        color: colors.textTertiary,
      },
      dayNumberToday: {
        fontWeight: '500',
        color: colors.textPrimary,
      },

      // Ensures date stays above any overlays and above the image
      dayNumberLayer: {
        position: 'absolute',
        top: cellPad,
        left: cellPad,
        zIndex: 50,
        elevation: 50, // Android
      },

      // Image container as a BACKGROUND layer (does not affect date position)
      outfitImagesContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: spacing.xs / 2,
        overflow: 'hidden',
        backgroundColor: colors.gray100,
        zIndex: 0,
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
        zIndex: 60,
        elevation: 60,
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
      {/* Background image layer (only if there’s an outfit entry) */}
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

      {/* Date is always anchored to the same top-left position in the cell */}
      <Text
        pointerEvents="none"
        style={[
          styles.dayNumber,
          styles.dayNumberLayer,
          !inCurrentMonth && styles.dayNumberOtherMonth,
          isToday && styles.dayNumberToday,
        ]}
      >
        {date.getDate()}
      </Text>
    </TouchableOpacity>
  );
}
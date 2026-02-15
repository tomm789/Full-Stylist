/**
 * Calendar Day Screen (Refactored)
 * View and manage calendar entries for a specific day
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDayEntries,
  useSlotPresets,
  useUserOutfits,
} from '@/hooks/calendar';
import {
  EntryCard,
  CalendarDayHeader,
} from '@/components/calendar';
import { LoadingSpinner } from '@/components/shared';
import { theme } from '@/styles';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createCommonStyles } from '@/styles/commonStyles';
import type { ThemeColors } from '@/styles/themes';

const { spacing, borderRadius } = theme;

export default function CalendarDayScreen() {
  const colors = useThemeColors();
  const commonStyles = createCommonStyles(colors);
  const styles = createStyles(colors);
  const { date } = useLocalSearchParams<{
    date: string | string[];
  }>();

  const router = useRouter();
  const { user } = useAuth();

  const userId = user?.id;
  const dateKey = Array.isArray(date) ? date[0] : date;

  // Data hooks
  const {
    entries,
    loading,
    refresh,
    updateEntry,
    deleteEntry,
    reorderEntries,
  } = useDayEntries({ userId, date: dateKey });

  const { presets } = useSlotPresets({ userId });
  const { outfits, outfitImages } = useUserOutfits({ userId });

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (userId && dateKey) {
        refresh();
      }
    }, [userId, dateKey, refresh])
  );

  const navigateToAdjacentDay = (direction: 'prev' | 'next') => {
    if (!dateKey) return;

    const currentDate = new Date(dateKey);
    const offset = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + offset);

    const newDateKey = newDate.toISOString().split('T')[0];
    router.replace(`/calendar/day/${newDateKey}`);
  };

  if (!dateKey) {
    return (
      <View style={commonStyles.container}>
        <Text style={{ color: colors.textSecondary }}>Invalid date.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LoadingSpinner text="Loading day..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <CalendarDayHeader
        date={dateKey}
        onBack={() => router.back()}
        onNavigateDay={navigateToAdjacentDay}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {entries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No entries for this day</Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                slotPresets={presets}
                outfits={outfits}
                outfitImages={outfitImages}
                canMoveUp={index > 0}
                canMoveDown={index < entries.length - 1}
                onMoveUp={() => {
                  if (index > 0) {
                    reorderEntries(index, index - 1);
                  }
                }}
                onMoveDown={() => {
                  if (index < entries.length - 1) {
                    reorderEntries(index, index + 1);
                  }
                }}
                onEdit={() => router.push(`/calendar/entry/${dateKey}?entryId=${entry.id}` as any)}
                onDelete={() => {
                  Alert.alert('Delete entry?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry.id) },
                  ]);
                }}
                onViewOutfit={(outfitId) => router.push(`/outfits/${outfitId}/view`)}
                onStatusChange={(status) => updateEntry(entry.id, { status })}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(`/calendar/entry/${dateKey}` as any)}
        >
          <Text style={styles.addButtonText}>+ Add Entry</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl + spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  entriesList: {
    gap: spacing.sm + spacing.xs / 2,
    marginBottom: spacing.lg + spacing.md,
  },
  addButton: {
    backgroundColor: colors.black,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.lg,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

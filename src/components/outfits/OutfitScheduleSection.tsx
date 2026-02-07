/**
 * OutfitScheduleSection Component
 * Schedule an outfit on the calendar from the editor
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { createCalendarEntry, deleteCalendarEntry, getOutfitScheduledDates, CalendarEntry } from '@/lib/calendar';
import { theme } from '@/styles';
import { PrimaryButton, ScheduleCalendar } from '@/components/shared';
import { useThemeColors } from '@/contexts/ThemeContext';
import type { ThemeColors } from '@/styles/themes';

const { spacing } = theme;

interface OutfitScheduleSectionProps {
  outfitId: string;
  isNew: boolean;
  userId?: string;
}

export default function OutfitScheduleSection({
  outfitId,
  isNew,
  userId,
}: OutfitScheduleSectionProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduledDates, setScheduledDates] = useState<Date[]>([]);
  const [scheduledEntries, setScheduledEntries] = useState<Record<string, CalendarEntry>>({});
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const dateKeyFor = useCallback((date: Date) => {
    return date.toISOString().split('T')[0];
  }, []);

  const loadScheduledDates = useCallback(async () => {
    if (!userId || isNew) return;

    const { data, error } = await getOutfitScheduledDates(userId, outfitId);
    if (error) {
      console.error('Failed to load scheduled dates', error);
      return;
    }

    const entriesByDate: Record<string, CalendarEntry> = {};
    const dates = data
      .map((item) => {
        const date = new Date(item.date);
        if (Number.isNaN(date.getTime())) return null;
        entriesByDate[dateKeyFor(date)] = item.entry;
        return date;
      })
      .filter((date): date is Date => Boolean(date));

    setScheduledEntries(entriesByDate);
    setScheduledDates(dates);
  }, [dateKeyFor, isNew, outfitId, userId]);

  useEffect(() => {
    void loadScheduledDates();
  }, [loadScheduledDates]);

  const selectedDateKey = useMemo(
    () => (selectedDate ? dateKeyFor(selectedDate) : null),
    [dateKeyFor, selectedDate]
  );

  const isSelectedScheduled = useMemo(() => {
    if (!selectedDateKey) return false;
    return Boolean(scheduledEntries[selectedDateKey]);
  }, [scheduledEntries, selectedDateKey]);

  const handleScheduleToggle = useCallback(async () => {
    if (!selectedDate || !userId || isNew) return;

    setScheduleSaving(true);
    const dateKey = dateKeyFor(selectedDate);
    const existingEntry = scheduledEntries[dateKey];

    if (existingEntry) {
      const { error } = await deleteCalendarEntry(existingEntry.id);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to remove scheduled date');
      }
    } else {
      const { error } = await createCalendarEntry(userId, dateKey, {
        outfit_id: outfitId,
        status: 'planned',
        sort_order: 0,
      });
      if (error) {
        Alert.alert('Error', error.message || 'Failed to schedule outfit');
      }
    }

    await loadScheduledDates();
    setScheduleSaving(false);
  }, [dateKeyFor, isNew, loadScheduledDates, outfitId, scheduledEntries, selectedDate, userId]);

  return (
    <View style={styles.scheduleSection}>
      <Text style={styles.sectionTitle}>Schedule this outfit</Text>
      {isNew ? (
        <Text style={styles.sectionSubtitle}>
          Save the outfit to add it to your calendar.
        </Text>
      ) : (
        <>
          <ScheduleCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            scheduledDates={scheduledDates}
          />
          <Text style={styles.sectionSubtitle}>
            {selectedDate
              ? `Selected: ${selectedDate.toLocaleDateString()}`
              : 'Tap a date to schedule this outfit.'}
          </Text>
          <PrimaryButton
            title={isSelectedScheduled ? 'Remove from Calendar' : 'Add to Calendar'}
            onPress={handleScheduleToggle}
            disabled={!selectedDate || scheduleSaving}
            loading={scheduleSaving}
            style={styles.scheduleButton}
          />
        </>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  scheduleSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
  },
  scheduleButton: {
    marginTop: spacing.sm,
  },
});
/**
 * useDayEntries Hook
 * Manages calendar entries for a specific day
 */

import { useState, useEffect } from 'react';
import {
  getCalendarEntriesForDate,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  CalendarEntry,
} from '@/lib/calendar';

interface UseDayEntriesProps {
  userId: string | undefined;
  date: string | undefined;
}

interface UseDayEntriesReturn {
  entries: CalendarEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  addEntry: (data: {
    outfit_id?: string;
    slot_preset_id?: string;
    custom_label?: string;
    status?: 'planned' | 'worn' | 'skipped';
    notes?: string;
    sort_order?: number;
  }) => Promise<{ data: any; error: any }>;
  updateEntry: (
    entryId: string,
    data: Partial<CalendarEntry>
  ) => Promise<{ error: any }>;
  deleteEntry: (entryId: string) => Promise<{ error: any }>;
  reorderEntries: (fromIndex: number, toIndex: number) => Promise<void>;
}

export function useDayEntries({
  userId,
  date,
}: UseDayEntriesProps): UseDayEntriesReturn {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    if (!userId || !date) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: dayEntries } = await getCalendarEntriesForDate(userId, date);
      if (dayEntries) {
        setEntries(dayEntries);
      }
    } catch (error) {
      console.error('Error loading day entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadEntries();
  };

  const addEntry = async (data: {
    outfit_id?: string;
    slot_preset_id?: string;
    custom_label?: string;
    status?: 'planned' | 'worn' | 'skipped';
    notes?: string;
    sort_order?: number;
  }) => {
    if (!userId || !date) {
      return { data: null, error: { message: 'User or date not provided' } };
    }

    const result = await createCalendarEntry(userId, date, data);

    if (!result.error) {
      await refresh();
    }

    return result;
  };

  const updateEntry = async (entryId: string, data: Partial<CalendarEntry>) => {
    const result = await updateCalendarEntry(entryId, data);

    if (!result.error) {
      await refresh();
    }

    return result;
  };

  const deleteEntry = async (entryId: string) => {
    const result = await deleteCalendarEntry(entryId);

    if (!result.error) {
      setEntries(entries.filter((e) => e.id !== entryId));
    }

    return result;
  };

  const reorderEntries = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    // Optimistic update
    const newEntries = [...entries];
    const [movedEntry] = newEntries.splice(fromIndex, 1);
    newEntries.splice(toIndex, 0, movedEntry);
    setEntries(newEntries);

    try {
      // Update sort_order for all affected entries
      const updates = newEntries.map((entry, index) => ({
        id: entry.id,
        sort_order: index,
      }));

      const updatePromises = updates.map((update) =>
        updateCalendarEntry(update.id, { sort_order: update.sort_order })
      );

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        // Rollback on error
        await refresh();
      }
    } catch (error) {
      // Rollback on error
      await refresh();
    }
  };

  useEffect(() => {
    loadEntries();
  }, [userId, date]);

  return {
    entries,
    loading,
    refresh,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
  };
}

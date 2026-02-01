/**
 * useDayEntries Hook
 * Manages calendar entries for a specific day
 */

import { useState, useEffect, useCallback } from 'react';
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

export function useDayEntries({ userId, date }: UseDayEntriesProps): UseDayEntriesReturn {
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    if (!userId || !date) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: dayEntries } = await getCalendarEntriesForDate(userId, date);
      setEntries(dayEntries ?? []);
    } catch (error) {
      console.error('Error loading day entries:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  const refresh = useCallback(async () => {
    await loadEntries();
  }, [loadEntries]);

  const addEntry: UseDayEntriesReturn['addEntry'] = async (data) => {
    if (!userId || !date) {
      return { data: null, error: { message: 'User or date not provided' } };
    }

    const result = await createCalendarEntry(userId, date, data);
    if (!result.error) await refresh();
    return result;
  };

  const updateEntry: UseDayEntriesReturn['updateEntry'] = async (entryId, data) => {
    const result = await updateCalendarEntry(entryId, data);
    if (!result.error) await refresh();
    return { error: result.error };
  };

  const deleteEntry: UseDayEntriesReturn['deleteEntry'] = async (entryId) => {
    const result = await deleteCalendarEntry(entryId);

    // Optimistically remove from local state
    if (!result.error) {
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    }

    return { error: result.error };
  };

  const reorderEntries: UseDayEntriesReturn['reorderEntries'] = async (fromIndex, toIndex) => {
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

      const results = await Promise.all(
        updates.map((u) => updateCalendarEntry(u.id, { sort_order: u.sort_order }))
      );

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        await refresh(); // rollback
      }
    } catch {
      await refresh(); // rollback
    }
  };

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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
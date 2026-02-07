import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CalendarEntry,
  createCalendarEntry,
  deleteCalendarEntry,
  getCalendarEntriesForDate,
  updateCalendarEntry,
} from '@/lib/calendar';
import { useCalendarDayForm } from '@/hooks/calendar';
import { OutfitScheduleStatus, ScheduleInfo } from '@/types/outfits';

type ScheduleRecord = {
  date: string;
  status: OutfitScheduleStatus;
  entryId: string;
};

type UseOutfitScheduleParams = {
  userId?: string;
  outfitIds: string[];
  statusLabels: Record<OutfitScheduleStatus, string>;
};

export function useOutfitSchedule({
  userId,
  outfitIds,
  statusLabels,
}: UseOutfitScheduleParams) {
  const [scheduleByOutfitId, setScheduleByOutfitId] = useState<Map<string, ScheduleRecord>>(
    new Map()
  );
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [entriesForDate, setEntriesForDate] = useState<CalendarEntry[]>([]);
  const [loadingEntriesForDate, setLoadingEntriesForDate] = useState(false);
  const [scheduleOutfitId, setScheduleOutfitId] = useState<string | null>(null);

  const loadEntriesForDate = useCallback(
    async (dateKey: string) => {
      if (!userId) return [];
      setLoadingEntriesForDate(true);
      const { data, error } = await getCalendarEntriesForDate(userId, dateKey);
      if (error) {
        console.error('Failed to load calendar entries for date', error);
      }
      setEntriesForDate(data || []);
      setLoadingEntriesForDate(false);
      return data || [];
    },
    [userId]
  );

  const loadSchedules = useCallback(async () => {
    if (!userId || outfitIds.length === 0) {
      setScheduleByOutfitId(new Map());
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calendar_entries')
        .select('id,outfit_id,status,calendar_day:calendar_days!calendar_day_id(date, owner_user_id)')
        .in('outfit_id', outfitIds);

      if (error) {
        console.error('Failed to load outfit schedules:', error);
        return;
      }

      const scheduleMap = new Map<string, ScheduleRecord>();

      (data || []).forEach((entry: any) => {
        const outfitId = entry.outfit_id as string | null;
        const date = entry.calendar_day?.date as string | undefined;
        const ownerId = entry.calendar_day?.owner_user_id as string | undefined;
        const status = entry.status as OutfitScheduleStatus | undefined;
        const entryId = entry.id as string | undefined;

        if (!outfitId || !date || !status || !entryId) return;
        if (ownerId && ownerId !== userId) return;

        const existing = scheduleMap.get(outfitId);
        if (!existing || date > existing.date) {
          scheduleMap.set(outfitId, { date, status, entryId });
        }
      });

      setScheduleByOutfitId(scheduleMap);
    } catch (error) {
      console.error('Failed to load outfit schedules:', error);
    }
  }, [outfitIds, userId]);

  const addEntry = useCallback(
    async (entry: {
      outfit_id?: string;
      slot_preset_id: string;
      status: OutfitScheduleStatus;
      notes?: string;
      sort_order: number;
    }) => {
      if (!userId || !selectedDateKey) {
        return { error: new Error('Missing date or user') };
      }
      const result = await createCalendarEntry(userId, selectedDateKey, entry);
      await loadSchedules();
      return result;
    },
    [selectedDateKey, userId, loadSchedules]
  );

  const updateEntry = useCallback(
    async (entryId: string, updates: any) => {
      const result = await updateCalendarEntry(entryId, updates);
      await loadSchedules();
      return result;
    },
    [loadSchedules]
  );

  const deleteEntry = useCallback(
    async (entryId: string) => {
      const result = await deleteCalendarEntry(entryId);
      await loadSchedules();
      return result;
    },
    [loadSchedules]
  );

  const form = useCalendarDayForm({
    entries: entriesForDate,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries: async () => {},
  });

  const handleDateSelect = useCallback(
    async (date: Date) => {
      const dateKey = date.toISOString().split('T')[0];
      setSelectedDateKey(dateKey);
      setShowDatePickerModal(false);

      await loadEntriesForDate(dateKey);
      form.resetForm();

      if (scheduleOutfitId) {
        form.setSelectedOutfit(scheduleOutfitId);
      }

      form.setShowAddModal(true);
    },
    [form, loadEntriesForDate, scheduleOutfitId]
  );

  const openScheduleForOutfit = useCallback(
    async (outfitId: string) => {
      setScheduleOutfitId(outfitId);
      const schedule = scheduleByOutfitId.get(outfitId);
      if (!schedule) {
        setShowDatePickerModal(true);
        return;
      }

      setSelectedDateKey(schedule.date);
      const entries = await loadEntriesForDate(schedule.date);
      form.resetForm();
      form.setSelectedOutfit(outfitId);

      const entry = entries.find((item) => item.id === schedule.entryId);
      if (entry) {
        form.handleEditEntry(entry);
      } else {
        form.setShowAddModal(true);
      }
    },
    [form, loadEntriesForDate, scheduleByOutfitId]
  );

  const formatScheduleDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const getScheduleInfo = useCallback(
    (outfitId: string): ScheduleInfo => {
      const schedule = scheduleByOutfitId.get(outfitId);
      if (!schedule) {
        return {
          overlayLabel: 'Not scheduled',
          statusLabel: 'Not scheduled',
          status: null,
        };
      }

      const statusLabel = statusLabels[schedule.status];
      const dateLabel = formatScheduleDate(schedule.date);

      return {
        overlayLabel: `${dateLabel} • ${statusLabel}`,
        statusLabel,
        status: schedule.status,
      };
    },
    [formatScheduleDate, scheduleByOutfitId, statusLabels]
  );

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!isMounted) return;
      await loadSchedules();
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [loadSchedules]);

  return {
    scheduleByOutfitId,
    showDatePickerModal,
    setShowDatePickerModal,
    selectedDateKey,
    entriesForDate,
    loadingEntriesForDate,
    scheduleOutfitId,
    form,
    loadSchedules,
    handleDateSelect,
    openScheduleForOutfit,
    getScheduleInfo,
  };
}

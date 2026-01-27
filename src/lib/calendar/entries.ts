import { supabase } from '../supabase';
import { getOrCreateCalendarDay } from './days';
import type { CalendarSlotPreset } from './presets';

export interface CalendarEntry {
  id: string;
  calendar_day_id: string;
  outfit_id?: string;
  slot_preset_id?: string;
  custom_label?: string;
  start_time?: string;
  end_time?: string;
  status: 'planned' | 'worn' | 'skipped';
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get calendar entries for a date range
 */
export async function getCalendarEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  data: Array<CalendarEntry & { calendar_day?: any; outfit?: any; slot_preset?: CalendarSlotPreset }>;
  error: any;
}> {
  const { data: days, error: daysError } = await supabase
    .from('calendar_days')
    .select('*')
    .eq('owner_user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (daysError || !days) {
    return { data: [], error: daysError };
  }

  const dayIds = days.map((d) => d.id);

  if (dayIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: entries, error: entriesError } = await supabase
    .from('calendar_entries')
    .select('*, calendar_days(*), outfits(*), calendar_slot_presets(*)')
    .in('calendar_day_id', dayIds)
    .order('sort_order', { ascending: true });

  return { data: entries || [], error: entriesError };
}

/**
 * Create calendar entry
 */
export async function createCalendarEntry(
  userId: string,
  date: string,
  entryData: {
    outfit_id?: string;
    slot_preset_id?: string;
    custom_label?: string;
    start_time?: string;
    end_time?: string;
    status?: 'planned' | 'worn' | 'skipped';
    notes?: string;
    sort_order?: number;
  }
): Promise<{
  data: CalendarEntry | null;
  error: any;
}> {
  const { data: calendarDay, error: dayError } = await getOrCreateCalendarDay(userId, date);
  if (dayError || !calendarDay) {
    return { data: null, error: dayError };
  }

  const { data: entry, error: entryError } = await supabase
    .from('calendar_entries')
    .insert({
      calendar_day_id: calendarDay.id,
      outfit_id: entryData.outfit_id || null,
      slot_preset_id: entryData.slot_preset_id || null,
      custom_label: entryData.custom_label || null,
      start_time: entryData.start_time || null,
      end_time: entryData.end_time || null,
      status: entryData.status || 'planned',
      notes: entryData.notes || null,
      sort_order: entryData.sort_order ?? 0,
    })
    .select()
    .single();

  return { data: entry, error: entryError };
}

/**
 * Update calendar entry
 */
export async function updateCalendarEntry(
  entryId: string,
  updates: Partial<Omit<CalendarEntry, 'id' | 'calendar_day_id' | 'created_at'>>
): Promise<{
  data: CalendarEntry | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('calendar_entries')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .select()
    .single();

  return { data, error };
}

/**
 * Delete calendar entry
 */
export async function deleteCalendarEntry(entryId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('calendar_entries')
    .delete()
    .eq('id', entryId);

  return { error };
}

/**
 * Get entries for a specific date
 */
export async function getCalendarEntriesForDate(
  userId: string,
  date: string
): Promise<{
  data: Array<CalendarEntry & { outfit?: any; slot_preset?: CalendarSlotPreset }>;
  error: any;
}> {
  const { data: day } = await getOrCreateCalendarDay(userId, date);
  if (!day) {
    return { data: [], error: null };
  }

  const { data: entries, error } = await supabase
    .from('calendar_entries')
    .select('*, outfits(*), calendar_slot_presets(*)')
    .eq('calendar_day_id', day.id)
    .order('sort_order', { ascending: true });

  return { data: entries || [], error };
}

/**
 * Get all scheduled dates for a specific outfit
 */
export async function getOutfitScheduledDates(
  userId: string,
  outfitId: string
): Promise<{
  data: Array<{ date: string; entry: CalendarEntry }>;
  error: any;
}> {
  try {
    const { data: entries, error } = await supabase
      .from('calendar_entries')
      .select('*, calendar_day:calendar_days!calendar_day_id(date, owner_user_id)')
      .eq('outfit_id', outfitId);

    if (error) {
      return { data: [], error };
    }

    const scheduledDates = (entries || [])
      .filter((entry: any) => entry.calendar_day?.owner_user_id === userId)
      .map((entry: any) => ({
        date: entry.calendar_day?.date,
        entry,
      }))
      .filter((item: any) => item.date);

    return { data: scheduledDates, error: null };
  } catch (e: any) {
    return { data: [], error: e };
  }
}

/**
 * Calendar module - exports all calendar-related functions
 * 
 * Usage:
 * import { getSlotPresets, createCalendarEntry } from '@/lib/calendar';
 */

export {
  type CalendarSlotPreset,
  getSlotPresets,
  createSlotPreset,
} from './presets';

export {
  type CalendarDay,
  getOrCreateCalendarDay,
} from './days';

export {
  type CalendarEntry,
  getCalendarEntries,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  getCalendarEntriesForDate,
  getOutfitScheduledDates,
} from './entries';

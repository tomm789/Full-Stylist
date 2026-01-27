import { supabase } from '../supabase';

export interface CalendarDay {
  id: string;
  owner_user_id: string;
  date: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get or create calendar day
 */
export async function getOrCreateCalendarDay(
  userId: string,
  date: string
): Promise<{
  data: CalendarDay | null;
  error: any;
}> {
  // Try to get existing day
  const { data: existing, error: findError } = await supabase
    .from('calendar_days')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('date', date)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Create new day
  const { data: newDay, error: createError } = await supabase
    .from('calendar_days')
    .insert({
      owner_user_id: userId,
      date,
    })
    .select()
    .single();

  return { data: newDay, error: createError };
}

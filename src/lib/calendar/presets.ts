import { supabase } from '../supabase';

export interface CalendarSlotPreset {
  id: string;
  scope: 'system' | 'user';
  owner_user_id?: string;
  name: string;
  icon?: string;
  sort_order: number;
  created_at: string;
}

/**
 * Get slot presets (system + user)
 */
export async function getSlotPresets(userId: string): Promise<{
  data: CalendarSlotPreset[];
  error: any;
}> {
  // Fetch system and user presets in parallel
  const [systemResult, userResult] = await Promise.all([
    supabase
      .from('calendar_slot_presets')
      .select('*')
      .eq('scope', 'system')
      .order('sort_order', { ascending: true }),
    supabase
      .from('calendar_slot_presets')
      .select('*')
      .eq('scope', 'user')
      .eq('owner_user_id', userId)
      .order('sort_order', { ascending: true }),
  ]);

  const allPresets = [
    ...(systemResult.data || []),
    ...(userResult.data || []),
  ];

  return { data: allPresets, error: systemResult.error || userResult.error };
}

/**
 * Create user slot preset
 */
export async function createSlotPreset(
  userId: string,
  name: string,
  icon?: string,
  sortOrder?: number
): Promise<{
  data: CalendarSlotPreset | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('calendar_slot_presets')
    .insert({
      scope: 'user',
      owner_user_id: userId,
      name,
      icon,
      sort_order: sortOrder ?? 100,
    })
    .select()
    .single();

  return { data, error };
}

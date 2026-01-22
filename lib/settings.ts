import { supabase } from './supabase';

export interface UserSettings {
  user_id: string;
  account_privacy: 'public' | 'private';
  search_visibility: 'visible' | 'hidden';
  default_visibility: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
  allow_external_sharing: boolean;
  headshot_image_id?: string | null;
  body_shot_image_id?: string | null;
  ai_model_preference?: string;
  ai_model_password?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get user settings
 */
export async function getUserSettings(userId: string): Promise<{
  data: UserSettings | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  return { data, error };
}

/**
 * Update user settings
 */
export async function updateUserSettings(
  userId: string,
  updates: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_settings')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return { error };
}
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
  include_headshot_in_generation?: boolean;
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
  updates: Partial<UserSettings>
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    });

  return { error };
}

/**
 * Validate password for advanced AI models via Netlify function
 * This keeps the password secure on the server side
 */
export async function validateModelPassword(
  password: string,
  userId?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Determine the Netlify function URL
    const isDev =
      typeof process !== 'undefined' &&
      process.env.NODE_ENV === 'development';
    
    let baseUrl = process.env.EXPO_PUBLIC_NETLIFY_URL || '';
    
    if (!baseUrl) {
      if (isDev) {
        baseUrl = process.env.EXPO_PUBLIC_NETLIFY_DEV_URL || 'http://localhost:8888';
      } else {
        // In production, try to use current origin
        if (typeof window !== 'undefined') {
          baseUrl = window.location.origin;
        } else {
          return { valid: false, error: 'Unable to determine Netlify URL' };
        }
      }
    }

    const functionUrl = `${baseUrl}/.netlify/functions/validate-model-password`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password, userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        valid: false, 
        error: errorData.error || `Server error: ${response.status}` 
      };
    }

    const data = await response.json();
    return { valid: data.valid === true, error: data.error };
  } catch (error: any) {
    console.error('[validateModelPassword] Error:', error);
    return { 
      valid: false, 
      error: error.message || 'Failed to validate password' 
    };
  }
}

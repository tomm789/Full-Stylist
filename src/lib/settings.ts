import { supabase } from './supabase';
import { resolveNetlifyBaseUrl } from './netlify';

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
  ai_model_outfit_render?: string | null;
  ai_model_outfit_mannequin?: string | null;
  ai_model_wardrobe_item_generate?: string | null;
  ai_model_wardrobe_item_render?: string | null;
  ai_model_product_shot?: string | null;
  ai_model_headshot_generate?: string | null;
  ai_model_body_shot_generate?: string | null;
  ai_model_auto_tag?: string | null;
  ai_model_style_advice?: string | null;
  ai_model_lock_outfit_render?: boolean | null;
  ai_model_lock_outfit_mannequin?: boolean | null;
  ai_model_lock_wardrobe_item_generate?: boolean | null;
  ai_model_lock_wardrobe_item_render?: boolean | null;
  ai_model_lock_product_shot?: boolean | null;
  ai_model_lock_headshot_generate?: boolean | null;
  ai_model_lock_body_shot_generate?: boolean | null;
  ai_model_lock_auto_tag?: boolean | null;
  ai_model_lock_style_advice?: boolean | null;
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
    const { baseUrl, isDev } = resolveNetlifyBaseUrl();
    if (!baseUrl && !isDev) {
      return { valid: false, error: 'Unable to determine Netlify URL' };
    }

    let trimmedBaseUrl = baseUrl;
    while (trimmedBaseUrl.endsWith('/')) {
      trimmedBaseUrl = trimmedBaseUrl.slice(0, -1);
    }
    const functionUrl = `${trimmedBaseUrl}/.netlify/functions/validate-model-password`;

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

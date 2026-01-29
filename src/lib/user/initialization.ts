import { supabase } from '../supabase';

/**
 * Initialize user profile after authentication
 * Creates: users, user_settings, default wardrobe
 */
export async function initializeUserProfile(
  userId: string,
  handle: string,
  displayName: string,
  settings?: {
    account_privacy?: 'public' | 'private';
    search_visibility?: 'visible' | 'hidden';
    default_visibility?: 'public' | 'followers' | 'private_link' | 'private' | 'inherit';
    allow_external_sharing?: boolean;
  }
) {
  try {
    // Create user profile
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        handle,
        display_name: displayName,
      });

    if (userError) {
      // If user already exists, that's okay (idempotent)
      if (userError.code !== '23505') {
        throw userError;
      }
    }

    // Create user settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        account_privacy: settings?.account_privacy || 'public',
        search_visibility: settings?.search_visibility || 'visible',
        default_visibility: settings?.default_visibility || 'followers',
        allow_external_sharing: settings?.allow_external_sharing ?? true,
      });

    if (settingsError) {
      // If settings already exist, that's okay (idempotent)
      if (settingsError.code !== '23505') {
        throw settingsError;
      }
    }

    // Create default wardrobe
    const { error: wardrobeError } = await supabase
      .from('wardrobes')
      .insert({
        owner_user_id: userId,
        title: 'My Wardrobe',
        visibility: settings?.default_visibility || 'followers',
      });

    if (wardrobeError) {
      // Check if wardrobe already exists
      if (wardrobeError.code !== '23505') {
        throw wardrobeError;
      }
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Check if user profile is complete
 */
export async function isUserProfileComplete(userId: string): Promise<boolean> {
  try {
    console.log('[isUserProfileComplete] Checking profile for user:', userId);
    
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[isUserProfileComplete] Error checking user:', userError);
      // Handle various "not found" error codes
      // PGRST116 = not found
      // 406 = Not Acceptable (can occur with RLS when user doesn't exist)
      // PGRST301 = no rows returned
      if (userError.code === 'PGRST116' || userError.code === 'PGRST301' || (userError as any).status === 406) {
        console.log('[isUserProfileComplete] User not found in users table (expected for new users)');
      } else {
        // Log unexpected errors but still return false (treat as incomplete)
        console.warn('[isUserProfileComplete] Unexpected error checking user:', userError.code, userError.message);
      }
      return false;
    }

    if (!user) {
      console.log('[isUserProfileComplete] User not found');
      return false;
    }

    console.log('[isUserProfileComplete] User found, checking settings...');

    // Check settings exist
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (settingsError) {
      console.error('[isUserProfileComplete] Error checking settings:', settingsError);
      // Handle various "not found" error codes
      if (settingsError.code === 'PGRST116' || settingsError.code === 'PGRST301' || (settingsError as any).status === 406) {
        console.log('[isUserProfileComplete] Settings not found');
      } else {
        console.warn('[isUserProfileComplete] Unexpected error checking settings:', settingsError.code, settingsError.message);
      }
      return false;
    }

    if (!settings) {
      console.log('[isUserProfileComplete] Settings not found');
      return false;
    }

    console.log('[isUserProfileComplete] Settings found, checking wardrobe...');

    // Check if at least one wardrobe exists (user might have multiple)
    const { data: wardrobes, error: wardrobeError } = await supabase
      .from('wardrobes')
      .select('id')
      .eq('owner_user_id', userId)
      .limit(1);

    if (wardrobeError) {
      console.error('[isUserProfileComplete] Error checking wardrobe:', wardrobeError);
      console.warn('[isUserProfileComplete] Unexpected error checking wardrobe:', wardrobeError.code, wardrobeError.message);
      return false;
    }

    const isComplete = wardrobes && wardrobes.length > 0;
    console.log('[isUserProfileComplete] Profile check complete. Result:', isComplete, 'Wardrobes found:', wardrobes?.length || 0);
    return isComplete;
  } catch (error: any) {
    console.error('[isUserProfileComplete] Exception checking profile:', error);
    // Return false on any exception - treat as incomplete profile
    return false;
  }
}

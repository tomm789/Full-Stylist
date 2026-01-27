import { supabase } from '../supabase';

/**
 * Get user profile (handle and display name)
 */
export async function getUserProfile(userId: string): Promise<{
  data: { handle: string; display_name: string } | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('users')
    .select('handle, display_name')
    .eq('id', userId)
    .single();

  return { data, error };
}

/**
 * Update user profile (handle and/or display name)
 */
export async function updateUserProfile(
  userId: string,
  updates: { handle?: string; display_name?: string }
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return { error };
}

/**
 * Search for users by handle or display name
 */
export async function searchUsers(query: string, limit: number = 20): Promise<{
  data: Array<{
    id: string;
    handle: string;
    display_name: string;
    avatar_url?: string;
  }>;
  error: any;
}> {
  try {
    if (!query || query.trim().length === 0) {
      return { data: [], error: null };
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('users')
      .select('id, handle, display_name')
      .or(`handle.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .limit(limit);

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get full user profile with stats
 */
export async function getFullUserProfile(userId: string): Promise<{
  data: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url?: string;
    headshot_image_url?: string;
    created_at: string;
    settings?: any;
    stats?: {
      posts: number;
      followers: number;
      following: number;
    };
  } | null;
  error: any;
}> {
  try {
    // Get user basic info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, handle, display_name, created_at')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!user) return { data: null, error: null };

    // Get user settings with headshot image
    const { data: settings } = await supabase
      .from('user_settings')
      .select(`
        headshot_image_id,
        headshot_image:headshot_image_id(storage_bucket, storage_key)
      `)
      .eq('user_id', userId)
      .single();

    // Build headshot URL if available
    let headshotUrl: string | undefined;
    if (settings?.headshot_image) {
      const { storage_bucket, storage_key } = settings.headshot_image as any;
      const { data: urlData } = supabase.storage
        .from(storage_bucket)
        .getPublicUrl(storage_key);
      headshotUrl = urlData?.publicUrl;
    }

    // Get stats
    const [postsCount, followersCount, followingCount] = await Promise.all([
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', userId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followed_user_id', userId)
        .eq('status', 'accepted'),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_user_id', userId)
        .eq('status', 'accepted'),
    ]);

    return {
      data: {
        ...user,
        headshot_image_url: headshotUrl,
        stats: {
          posts: postsCount.count || 0,
          followers: followersCount.count || 0,
          following: followingCount.count || 0,
        },
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

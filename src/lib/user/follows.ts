import { supabase } from '../supabase';

/**
 * Follow a user
 */
export async function followUser(
  followerId: string,
  followedId: string
): Promise<{ error: any }> {
  try {
    if (followerId === followedId) {
      return { error: new Error('Cannot follow yourself') };
    }

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_user_id: followerId,
        followed_user_id: followedId,
        status: 'requested', // Database trigger will auto-accept for public accounts
      });

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(
  followerId: string,
  followedId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_user_id', followerId)
      .eq('followed_user_id', followedId);

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(
  followerId: string,
  followedId: string
): Promise<{ isFollowing: boolean; status: 'requested' | 'accepted' | 'blocked' | null }> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('status')
      .eq('follower_user_id', followerId)
      .eq('followed_user_id', followedId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { isFollowing: false, status: null };
      }
      throw error;
    }

    return {
      isFollowing: true,
      status: data.status as 'requested' | 'accepted' | 'blocked',
    };
  } catch (error: any) {
    return { isFollowing: false, status: null };
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  data: Array<{
    id: string;
    follower_user_id: string;
    followed_user_id: string;
    status: string;
    created_at: string;
    follower?: {
      id: string;
      handle: string;
      display_name?: string;
    };
  }>;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('*, follower:users!follower_user_id(id, handle, display_name, avatar_url)')
      .eq('followed_user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return { data: data as any || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get users that a user is following
 */
export async function getFollowing(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  data: Array<{
    id: string;
    follower_user_id: string;
    followed_user_id: string;
    status: string;
    created_at: string;
    followed?: {
      id: string;
      handle: string;
      display_name?: string;
      avatar_url?: string | null;
    };
  }>;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('*, followed:users!followed_user_id(id, handle, display_name, avatar_url)')
      .eq('follower_user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return { data: data as any || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get pending follow requests for a user
 */
export async function getPendingFollowRequests(
  userId: string
): Promise<{
  data: Array<{
    id: string;
    follower_user_id: string;
    followed_user_id: string;
    status: string;
    created_at: string;
    follower?: {
      id: string;
      handle: string;
      display_name?: string;
      avatar_url?: string | null;
    };
  }>;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('*, follower:users!follower_user_id(id, handle, display_name, avatar_url)')
      .eq('followed_user_id', userId)
      .eq('status', 'requested')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data: data as any || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Accept a follow request
 */
export async function acceptFollowRequest(
  followerId: string,
  followedId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('follows')
      .update({ status: 'accepted' })
      .eq('follower_user_id', followerId)
      .eq('followed_user_id', followedId)
      .eq('status', 'requested');

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Reject a follow request
 */
export async function rejectFollowRequest(
  followerId: string,
  followedId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_user_id', followerId)
      .eq('followed_user_id', followedId)
      .eq('status', 'requested');

    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

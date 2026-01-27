import { supabase } from './supabase';
import { getPost } from './posts';

export interface Repost {
  id: string;
  user_id: string;
  original_post_id: string;
  caption?: string;
  created_at: string;
}

/**
 * Create a repost
 */
export async function createRepost(
  userId: string,
  originalPostId: string,
  caption?: string
): Promise<{
  data: Repost | null;
  error: any;
}> {
  try {
    // Check if post exists and is public
    const { data: post, error: postError } = await getPost(originalPostId);
    if (postError || !post) {
      throw new Error('Post not found');
    }

    if (post.visibility !== 'public') {
      throw new Error('Can only repost public posts');
    }

    // Check if already reposted
    const { data: existing } = await supabase
      .from('reposts')
      .select('id')
      .eq('user_id', userId)
      .eq('original_post_id', originalPostId)
      .single();

    if (existing) {
      // Already reposted, return existing
      const { data: repost } = await supabase
        .from('reposts')
        .select('*')
        .eq('id', existing.id)
        .single();
      return { data: repost, error: null };
    }

    // Create new repost
    const { data: repost, error } = await supabase
      .from('reposts')
      .insert({
        user_id: userId,
        original_post_id: originalPostId,
        caption: caption,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: repost, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Remove a repost
 */
export async function removeRepost(
  userId: string,
  originalPostId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('reposts')
      .delete()
      .eq('user_id', userId)
      .eq('original_post_id', originalPostId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Check if user has reposted a post
 */
export async function hasReposted(
  userId: string,
  originalPostId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('original_post_id', originalPostId)
    .single();

  return !!data;
}

/**
 * Get repost count for a post
 */
export async function getRepostCount(originalPostId: string): Promise<number> {
  const { count } = await supabase
    .from('reposts')
    .select('*', { count: 'exact', head: true })
    .eq('original_post_id', originalPostId);

  return count || 0;
}

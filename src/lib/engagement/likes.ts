import { supabase } from '../supabase';

export interface Like {
  id: string;
  user_id: string;
  entity_type: 'post' | 'outfit' | 'lookbook';
  entity_id: string;
  created_at: string;
}

/**
 * Like an entity (post, outfit, or lookbook)
 */
export async function likeEntity(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook' | 'feedback_thread',
  entityId: string
): Promise<{
  data: Like | null;
  error: any;
}> {
  try {
    // Check if already liked
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single();

    if (existing) {
      // Already liked, return existing
      const { data: like } = await supabase
        .from('likes')
        .select('*')
        .eq('id', existing.id)
        .single();
      return { data: like, error: null };
    }

    // Create new like
    const { data: like, error } = await supabase
      .from('likes')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: like, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Unlike an entity
 */
export async function unlikeEntity(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Check if user has liked an entity
 */
export async function hasLiked(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  return !!data;
}

/**
 * Get like count for an entity
 */
export async function getLikeCount(
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<number> {
  const { count } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  return count || 0;
}

/**
 * Get users who liked an entity
 */
export async function getLikes(
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string,
  limit: number = 50
): Promise<{
  data: Array<Like & { user?: { id: string; handle: string; display_name?: string } }>;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('*, user:users(id, handle, display_name)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return { data: data as any || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

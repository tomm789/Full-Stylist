import { supabase } from './supabase';

export interface Like {
  id: string;
  user_id: string;
  entity_type: 'post' | 'outfit' | 'lookbook';
  entity_id: string;
  created_at: string;
}

export interface Save {
  id: string;
  user_id: string;
  entity_type: 'post' | 'outfit' | 'lookbook';
  entity_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  entity_type: 'post' | 'outfit' | 'lookbook';
  entity_id: string;
  parent_comment_id?: string;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  user?: {
    id: string;
    handle: string;
    display_name?: string;
    avatar_url?: string;
  };
}

/**
 * Like an entity (post, outfit, or lookbook)
 */
export async function likeEntity(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
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
 * Save an entity (post, outfit, or lookbook)
 */
export async function saveEntity(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<{
  data: Save | null;
  error: any;
}> {
  try {
    // Check if already saved
    const { data: existing } = await supabase
      .from('saves')
      .select('id')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .single();

    if (existing) {
      // Already saved, return existing
      const { data: save } = await supabase
        .from('saves')
        .select('*')
        .eq('id', existing.id)
        .single();
      return { data: save, error: null };
    }

    // Create new save
    const { data: save, error } = await supabase
      .from('saves')
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

    return { data: save, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Unsave an entity
 */
export async function unsaveEntity(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('saves')
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
 * Check if user has saved an entity
 */
export async function hasSaved(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('saves')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single();

  return !!data;
}

/**
 * Get save count for an entity
 */
export async function getSaveCount(
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<number> {
  const { count } = await supabase
    .from('saves')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);

  return count || 0;
}

/**
 * Create a comment
 */
export async function createComment(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string,
  body: string,
  parentCommentId?: string
): Promise<{
  data: Comment | null;
  error: any;
}> {
  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        parent_comment_id: parentCommentId,
        body: body,
      })
      .select(
        `
        *,
        user:users(id, handle, display_name, avatar_url)
      `
      )
      .single();

    if (error) {
      throw error;
    }

    return { data: comment as any, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get comments for an entity
 */
export async function getComments(
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<{
  data: Comment[];
  error: any;
}> {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        user:users(id, handle, display_name, avatar_url)
      `
      )
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .is('parent_comment_id', null) // Only top-level comments for MVP
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data: (comments as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get comment count for an entity
 */
export async function getCommentCount(
  entityType: 'post' | 'outfit' | 'lookbook',
  entityId: string
): Promise<number> {
  const { count } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .is('deleted_at', null);

  return count || 0;
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(
  userId: string,
  commentId: string
): Promise<{
  error: any;
}> {
  try {
    const { error } = await supabase
      .from('comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

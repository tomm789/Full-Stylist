import { supabase } from '../supabase';

export interface Comment {
  id: string;
  user_id: string;
  entity_type: 'post' | 'outfit' | 'lookbook' | 'feedback_thread';
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
 * Create a comment
 */
export async function createComment(
  userId: string,
  entityType: 'post' | 'outfit' | 'lookbook' | 'feedback_thread',
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
  entityType: 'post' | 'outfit' | 'lookbook' | 'feedback_thread',
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
  entityType: 'post' | 'outfit' | 'lookbook' | 'feedback_thread',
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

/**
 * Update a comment
 */
export async function updateComment(
  userId: string,
  commentId: string,
  body: string
): Promise<{
  data: Comment | null;
  error: any;
}> {
  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', userId)
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
 * Get replies to a comment
 */
export async function getCommentReplies(
  commentId: string
): Promise<{
  data: Comment[];
  error: any;
}> {
  try {
    const { data: replies, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        user:users(id, handle, display_name, avatar_url)
      `
      )
      .eq('parent_comment_id', commentId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return { data: (replies as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

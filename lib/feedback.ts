import { supabase } from './supabase';
import { getComments, createComment, Comment } from './engagement';

export interface FeedbackThread {
  id: string;
  user_id: string;
  title: string;
  body: string;
  category: 'bug' | 'feature' | 'general' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    handle: string;
    display_name?: string;
    avatar_url?: string;
  };
  comment_count?: number;
}

export interface FeedbackThreadFilters {
  category?: 'bug' | 'feature' | 'general' | 'other';
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
}

/**
 * Get all feedback threads with optional filters
 */
export async function getFeedbackThreads(
  filters?: FeedbackThreadFilters
): Promise<{
  data: FeedbackThread[];
  error: any;
}> {
  try {
    let query = supabase
      .from('feedback_threads')
      .select(
        `
        *,
        user:users(id, handle, display_name, avatar_url)
      `
      )
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: threads, error } = await query;

    if (error) {
      throw error;
    }

    // Get comment counts for each thread
    const threadsWithCounts = await Promise.all(
      (threads || []).map(async (thread) => {
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('entity_type', 'feedback_thread')
          .eq('entity_id', thread.id)
          .is('deleted_at', null);

        return {
          ...thread,
          comment_count: count || 0,
        };
      })
    );

    return { data: threadsWithCounts as any, error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get a single feedback thread by ID
 */
export async function getFeedbackThread(
  id: string
): Promise<{
  data: FeedbackThread | null;
  error: any;
}> {
  try {
    const { data: thread, error } = await supabase
      .from('feedback_threads')
      .select(
        `
        *,
        user:users(id, handle, display_name, avatar_url)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    // Get comment count
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', 'feedback_thread')
      .eq('entity_id', id)
      .is('deleted_at', null);

    return {
      data: {
        ...thread,
        comment_count: count || 0,
      } as any,
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Create a new feedback thread
 */
export async function createFeedbackThread(
  userId: string,
  data: {
    title: string;
    body: string;
    category: 'bug' | 'feature' | 'general' | 'other';
  }
): Promise<{
  data: FeedbackThread | null;
  error: any;
}> {
  try {
    const { data: thread, error } = await supabase
      .from('feedback_threads')
      .insert({
        user_id: userId,
        title: data.title,
        body: data.body,
        category: data.category,
        status: 'open',
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

    return {
      data: {
        ...thread,
        comment_count: 0,
      } as any,
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update a feedback thread
 */
export async function updateFeedbackThread(
  userId: string,
  threadId: string,
  updates: {
    title?: string;
    body?: string;
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  }
): Promise<{
  data: FeedbackThread | null;
  error: any;
}> {
  try {
    const { data: thread, error } = await supabase
      .from('feedback_threads')
      .update(updates)
      .eq('id', threadId)
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

    // Get comment count
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('entity_type', 'feedback_thread')
      .eq('entity_id', threadId)
      .is('deleted_at', null);

    return {
      data: {
        ...thread,
        comment_count: count || 0,
      } as any,
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get comments for a feedback thread
 */
export async function getFeedbackThreadComments(
  threadId: string
): Promise<{
  data: Comment[];
  error: any;
}> {
  return getComments('feedback_thread', threadId);
}

/**
 * Create a comment on a feedback thread
 */
export async function createFeedbackThreadComment(
  userId: string,
  threadId: string,
  body: string,
  parentCommentId?: string
): Promise<{
  data: Comment | null;
  error: any;
}> {
  return createComment(userId, 'feedback_thread', threadId, body, parentCommentId);
}

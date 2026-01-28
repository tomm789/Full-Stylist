/**
 * Notifications Core API
 * Main API functions for notifications
 */

import { supabase } from '../supabase';
import { Notification } from './types';
import { enrichNotificationsWithEntityData } from './enrichment';

// Re-export types for backward compatibility
export type { Notification } from './types';

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  data: Notification[];
  error: any;
}> {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_user_id(id, handle, display_name, avatar_url)
      `)
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // Fetch entity data in batches
    if (notifications && notifications.length > 0) {
      await enrichNotificationsWithEntityData(notifications);
    }

    return { data: (notifications as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .eq('is_read', false);

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('recipient_user_id', userId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(userId: string): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_user_id', userId)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  userId: string,
  notificationId: string
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_user_id', userId);

    if (error) {
      throw error;
    }

    return { error: null };
  } catch (error: any) {
    return { error };
  }
}

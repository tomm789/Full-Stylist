import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Notification } from './core';

const activeNotificationChannels = new Map<string, RealtimeChannel>();

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const existingChannel = activeNotificationChannels.get(userId);
  if (existingChannel) {
    supabase.removeChannel(existingChannel);
    activeNotificationChannels.delete(userId);
  }

  const channelName = `notifications-${userId}-${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_user_id=eq.${userId}`,
      },
      async (payload) => {
        const { data } = await supabase
          .from('notifications')
          .select(`
            *,
            actor:actor_user_id(id, handle, display_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data as any);
        }
      }
    )
    .subscribe();

  activeNotificationChannels.set(userId, channel);

  return () => {
    supabase.removeChannel(channel);
    activeNotificationChannels.delete(userId);
  };
}

/**
 * Unsubscribe from all notification channels
 */
export function unsubscribeFromAllNotifications(): void {
  activeNotificationChannels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  activeNotificationChannels.clear();
}

/**
 * Get active notification channel for a user
 */
export function getActiveChannel(userId: string): RealtimeChannel | undefined {
  return activeNotificationChannels.get(userId);
}

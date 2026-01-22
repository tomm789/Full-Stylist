import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const activeNotificationChannels = new Map<string, RealtimeChannel>();

export interface Notification {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  notification_type: 
    | 'like_post' 
    | 'comment_post' 
    | 'repost' 
    | 'follow_request' 
    | 'follow_accepted'
    | 'like_outfit'
    | 'comment_outfit'
    | 'like_lookbook'
    | 'comment_lookbook';
  entity_type: 'post' | 'outfit' | 'lookbook' | 'comment' | 'follow' | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url?: string;
  };
  entity?: {
    post?: {
      id: string;
      entity_type: 'outfit' | 'lookbook';
      entity_id: string;
      outfit?: {
        id: string;
        cover_image_id?: string;
        cover_image?: {
          storage_bucket: string;
          storage_key: string;
        };
      };
      lookbook?: {
        id: string;
        cover_image_id?: string;
        cover_image?: {
          storage_bucket: string;
          storage_key: string;
        };
      };
    };
    outfit?: {
      id: string;
      cover_image_id?: string;
      cover_image?: {
        storage_bucket: string;
        storage_key: string;
      };
    };
    lookbook?: {
      id: string;
      cover_image_id?: string;
      cover_image?: {
        storage_bucket: string;
        storage_key: string;
      };
    };
  };
}

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

    // Fetch entity data in batches to avoid N+1 queries
    if (notifications && notifications.length > 0) {
      // Group by entity type
      const postIds = notifications.filter(n => n.entity_type === 'post' && n.entity_id).map(n => n.entity_id!);
      const outfitIds = notifications.filter(n => n.entity_type === 'outfit' && n.entity_id).map(n => n.entity_id!);
      const lookbookIds = notifications.filter(n => n.entity_type === 'lookbook' && n.entity_id).map(n => n.entity_id!);

      // Batch fetch posts
      if (postIds.length > 0) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id, entity_type, entity_id')
          .in('id', postIds);

        if (posts) {
          // Get all outfit and lookbook IDs from posts
          const postOutfitIds = posts.filter(p => p.entity_type === 'outfit').map(p => p.entity_id);
          const postLookbookIds = posts.filter(p => p.entity_type === 'lookbook').map(p => p.entity_id);

          // Fetch outfits for posts
          if (postOutfitIds.length > 0) {
            const { data: outfits } = await supabase
              .from('outfits')
              .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
              .in('id', postOutfitIds);

            if (outfits) {
              posts.forEach(post => {
                const outfit = outfits.find(o => o.id === post.entity_id);
                if (outfit) {
                  (post as any).outfit = outfit;
                }
              });
            }
          }

          // Fetch lookbooks for posts
          if (postLookbookIds.length > 0) {
            const { data: lookbooks, error: lookbookError } = await supabase
              .from('lookbooks')
              .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
              .in('id', postLookbookIds);

            if (lookbooks) {
              // For lookbooks without cover images, fetch first outfit's image as fallback
              const lookbooksNeedingFallback = lookbooks.filter(lb => !lb.cover_image_id);
              if (lookbooksNeedingFallback.length > 0) {
                const { data: lookbookOutfits } = await supabase
                  .from('lookbook_outfits')
                  .select(`
                    lookbook_id,
                    outfit:outfit_id(
                      id,
                      cover_image_id,
                      cover_image:cover_image_id(storage_bucket, storage_key)
                    )
                  `)
                  .in('lookbook_id', lookbooksNeedingFallback.map(lb => lb.id))
                  .order('position', { ascending: true });

                if (lookbookOutfits) {
                  // Attach first outfit's image to lookbooks without covers
                  lookbooksNeedingFallback.forEach(lookbook => {
                    const firstOutfit = lookbookOutfits.find(lo => lo.lookbook_id === lookbook.id);
                    if (firstOutfit?.outfit?.cover_image) {
                      (lookbook as any).cover_image = firstOutfit.outfit.cover_image;
                    }
                  });
                }
              }

              posts.forEach(post => {
                const lookbook = lookbooks.find(l => l.id === post.entity_id);
                if (lookbook) {
                  (post as any).lookbook = lookbook;
                }
              });
            }
          }

          // Attach posts to notifications
          notifications.forEach(notif => {
            if (notif.entity_type === 'post') {
              const post = posts.find(p => p.id === notif.entity_id);
              if (post) {
                notif.entity = { post };
              }
            }
          });
        }
      }

      // Batch fetch outfits
      if (outfitIds.length > 0) {
        const { data: outfits } = await supabase
          .from('outfits')
          .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
          .in('id', outfitIds);

        if (outfits) {
          notifications.forEach(notif => {
            if (notif.entity_type === 'outfit') {
              const outfit = outfits.find(o => o.id === notif.entity_id);
              if (outfit) {
                notif.entity = { outfit };
              }
            }
          });
        }
      }

      // Batch fetch lookbooks
      if (lookbookIds.length > 0) {
        const { data: lookbooks, error: lookbookError } = await supabase
          .from('lookbooks')
          .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
          .in('id', lookbookIds);

        if (lookbooks) {
          // For lookbooks without cover images, fetch first outfit's image as fallback
          const lookbooksNeedingFallback = lookbooks.filter(lb => !lb.cover_image_id);
          if (lookbooksNeedingFallback.length > 0) {
            const { data: lookbookOutfits } = await supabase
              .from('lookbook_outfits')
              .select(`
                lookbook_id,
                outfit:outfit_id(
                  id,
                  cover_image_id,
                  cover_image:cover_image_id(storage_bucket, storage_key)
                )
              `)
              .in('lookbook_id', lookbooksNeedingFallback.map(lb => lb.id))
              .order('position', { ascending: true });

            if (lookbookOutfits) {
              // Attach first outfit's image to lookbooks without covers
              lookbooksNeedingFallback.forEach(lookbook => {
                const firstOutfit = lookbookOutfits.find(lo => lo.lookbook_id === lookbook.id);
                if (firstOutfit?.outfit?.cover_image) {
                  (lookbook as any).cover_image = firstOutfit.outfit.cover_image;
                }
              });
            }
          }

          notifications.forEach(notif => {
            if (notif.entity_type === 'lookbook') {
              const lookbook = lookbooks.find(l => l.id === notif.entity_id);
              if (lookbook) {
                notif.entity = { lookbook };
              }
            }
          });
        }
      }
    }

    if (error) {
      throw error;
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
 * Get notification message text
 */
export function getNotificationMessage(notification: Notification): string {
  const actorName = notification.actor?.display_name || notification.actor?.handle || 'Someone';
  
  switch (notification.notification_type) {
    case 'like_post':
      return `${actorName} liked your post`;
    case 'comment_post':
      return `${actorName} commented on your post`;
    case 'repost':
      return `${actorName} reposted your post`;
    case 'follow_request':
      return `${actorName} wants to follow you`;
    case 'follow_accepted':
      return `${actorName} accepted your follow request`;
    case 'like_outfit':
      return `${actorName} liked your outfit`;
    case 'comment_outfit':
      return `${actorName} commented on your outfit`;
    case 'like_lookbook':
      return `${actorName} liked your lookbook`;
    case 'comment_lookbook':
      return `${actorName} commented on your lookbook`;
    default:
      return `New notification from ${actorName}`;
  }
}

/**
 * Get notification icon/emoji
 */
export function getNotificationIcon(notification: Notification): string {
  switch (notification.notification_type) {
    case 'like_post':
    case 'like_outfit':
    case 'like_lookbook':
      return '♥';
    case 'comment_post':
    case 'comment_outfit':
    case 'comment_lookbook':
      return '💬';
    case 'repost':
      return '↻';
    case 'follow_request':
    case 'follow_accepted':
      return '👤';
    default:
      return '🔔';
  }
}

/**
 * Get thumbnail URL for notification entity
 */
export function getNotificationThumbnail(notification: Notification): string | null {
  if (!notification.entity) {
    return null;
  }

  let imageData: { storage_bucket: string; storage_key: string } | null | undefined = null;

  if (notification.entity_type === 'post' && notification.entity.post) {
    const post = notification.entity.post;
    if (post.entity_type === 'outfit' && post.outfit?.cover_image) {
      imageData = post.outfit.cover_image;
    } else if (post.entity_type === 'lookbook' && post.lookbook?.cover_image) {
      imageData = post.lookbook.cover_image;
    }
  } else if (notification.entity_type === 'outfit' && notification.entity.outfit?.cover_image) {
    imageData = notification.entity.outfit.cover_image;
  } else if (notification.entity_type === 'lookbook' && notification.entity.lookbook?.cover_image) {
    imageData = notification.entity.lookbook.cover_image;
  }

  if (!imageData) {
    return null;
  }

  // Construct Supabase storage URL
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  return `${supabaseUrl}/storage/v1/object/public/${imageData.storage_bucket}/${imageData.storage_key}`;
}

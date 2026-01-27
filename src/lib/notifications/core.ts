import { supabase } from '../supabase';

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
 * Enrich notifications with entity data (posts, outfits, lookbooks)
 */
async function enrichNotificationsWithEntityData(notifications: any[]): Promise<void> {
  // Group by entity type
  const postIds = notifications.filter(n => n.entity_type === 'post' && n.entity_id).map(n => n.entity_id!);
  const outfitIds = notifications.filter(n => n.entity_type === 'outfit' && n.entity_id).map(n => n.entity_id!);
  const lookbookIds = notifications.filter(n => n.entity_type === 'lookbook' && n.entity_id).map(n => n.entity_id!);

  // Batch fetch posts
  if (postIds.length > 0) {
    await enrichWithPosts(notifications, postIds);
  }

  // Batch fetch outfits
  if (outfitIds.length > 0) {
    await enrichWithOutfits(notifications, outfitIds);
  }

  // Batch fetch lookbooks
  if (lookbookIds.length > 0) {
    await enrichWithLookbooks(notifications, lookbookIds);
  }
}

/**
 * Enrich notifications with post data
 */
async function enrichWithPosts(notifications: any[], postIds: string[]): Promise<void> {
  const { data: posts } = await supabase
    .from('posts')
    .select('id, entity_type, entity_id')
    .in('id', postIds);

  if (!posts) return;

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
    const { data: lookbooks } = await supabase
      .from('lookbooks')
      .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
      .in('id', postLookbookIds);

    if (lookbooks) {
      // For lookbooks without cover images, fetch first outfit's image
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

/**
 * Enrich notifications with outfit data
 */
async function enrichWithOutfits(notifications: any[], outfitIds: string[]): Promise<void> {
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

/**
 * Enrich notifications with lookbook data
 */
async function enrichWithLookbooks(notifications: any[], lookbookIds: string[]): Promise<void> {
  const { data: lookbooks } = await supabase
    .from('lookbooks')
    .select('id, cover_image_id, cover_image:cover_image_id(storage_bucket, storage_key)')
    .in('id', lookbookIds);

  if (!lookbooks) return;

  // For lookbooks without cover images, fetch first outfit's image
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

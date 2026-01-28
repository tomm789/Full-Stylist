import type { Notification } from './types';

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

/**
 * Group notifications by date
 */
export function groupNotificationsByDate(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>();
  
  notifications.forEach(notification => {
    const date = new Date(notification.created_at);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(notification);
  });
  
  return groups;
}

/**
 * Get relative time string for notification
 */
export function getRelativeTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return created.toLocaleDateString();
  }
}

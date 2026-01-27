/**
 * Notifications module - exports all notification-related functions
 * 
 * Usage:
 * import { getNotifications, subscribeToNotifications, getNotificationMessage } from '@/lib/notifications';
 */

// Re-export from core
export {
  type Notification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './core';

// Re-export from realtime
export {
  subscribeToNotifications,
  unsubscribeFromAllNotifications,
  getActiveChannel,
} from './realtime';

// Re-export from helpers
export {
  getNotificationMessage,
  getNotificationIcon,
  getNotificationThumbnail,
  groupNotificationsByDate,
  getRelativeTime,
} from './helpers';

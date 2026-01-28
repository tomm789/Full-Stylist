/**
 * Notifications Module Barrel File
 * Re-exports all notifications types, enrichment, core API, helpers, and realtime
 */

// Types
export type { Notification } from './types';

// Enrichment
export {
  enrichNotificationsWithEntityData,
  enrichWithPosts,
  enrichWithOutfits,
  enrichWithLookbooks,
} from './enrichment';

// Core API
export {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './core';

// Helpers
export {
  getNotificationMessage,
  getNotificationIcon,
  getNotificationThumbnail,
  groupNotificationsByDate,
  getRelativeTime,
} from './helpers';

// Realtime
export {
  subscribeToNotifications,
  unsubscribeFromAllNotifications,
  getActiveChannel,
} from './realtime';

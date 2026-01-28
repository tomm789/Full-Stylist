/**
 * Notifications Types
 * Type definitions for notifications
 */

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

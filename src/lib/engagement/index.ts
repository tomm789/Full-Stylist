/**
 * Engagement module - exports all engagement-related functions
 * 
 * Usage:
 * import { likeEntity, saveEntity, createComment } from '@/lib/engagement';
 */

// Re-export from likes
export {
  type Like,
  likeEntity,
  unlikeEntity,
  hasLiked,
  getLikeCount,
  getLikes,
} from './likes';

// Re-export from saves
export {
  type Save,
  saveEntity,
  unsaveEntity,
  hasSaved,
  getSaveCount,
  getUserSaves,
} from './saves';

// Re-export from comments
export {
  type Comment,
  createComment,
  getComments,
  getCommentCount,
  deleteComment,
  updateComment,
  getCommentReplies,
} from './comments';

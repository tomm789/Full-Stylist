/**
 * Engagement Hooks
 * Unified engagement system for likes, saves, comments, and reposts.
 */

export { useEngagementEntity } from './useEngagementEntity';
export { useEngagementFeed } from './useEngagementFeed';
export type {
  EngagementCounts,
  EngagementEntityType,
  DBEngagementEntityType,
  UseEngagementEntityOptions,
  UseEngagementEntityReturn,
  UseEngagementFeedOptions,
  UseEngagementFeedReturn,
  Comment,
} from './types';
export { DEFAULT_ENGAGEMENT_COUNTS } from './types';

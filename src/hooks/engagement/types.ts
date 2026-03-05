/**
 * Engagement System Types
 * Canonical type definitions for the unified engagement hooks.
 */

import type { Comment } from '@/lib/engagement';

export type { Comment };

/** All entity types the engagement system supports */
export type EngagementEntityType = 'outfit' | 'post' | 'lookbook' | 'wardrobe_item';

/** Entity types that the DB layer actually supports (wardrobe_item excluded) */
export type DBEngagementEntityType = 'outfit' | 'post' | 'lookbook';

/** Canonical engagement counts — single source of truth */
export interface EngagementCounts {
  likes: number;
  saves: number;
  comments: number;
  reposts: number;
  hasLiked: boolean;
  hasSaved: boolean;
  hasReposted: boolean;
}

export const DEFAULT_ENGAGEMENT_COUNTS: EngagementCounts = {
  likes: 0,
  saves: 0,
  comments: 0,
  reposts: 0,
  hasLiked: false,
  hasSaved: false,
  hasReposted: false,
};

// ─── Entity mode ─────────────────────────────────────────────────────────────

export interface UseEngagementEntityOptions {
  deferInitialFetch?: boolean;
}

export interface UseEngagementEntityReturn {
  liked: boolean;
  likeCount: number;
  saved: boolean;
  saveCount: number;
  commentCount: number;
  reposted: boolean;
  repostCount: number;
  comments: Comment[];
  loadingComments: boolean;
  toggleLike: () => Promise<void>;
  toggleSave: () => Promise<void>;
  toggleRepost: () => Promise<void>;
  loadComments: () => Promise<void>;
  submitComment: (text: string) => Promise<boolean>;
  triggerLoadEngagement: (() => void) | undefined;
}

// ─── Feed mode ───────────────────────────────────────────────────────────────

export interface UseEngagementFeedOptions {
  initialCounts?: Record<string, EngagementCounts>;
  onRepost?: (postId: string) => Promise<void>;
}

export interface UseEngagementFeedReturn {
  counts: Record<string, EngagementCounts>;
  seedCounts: (next: Record<string, EngagementCounts>) => void;
  getCountsFor: (entityId: string) => EngagementCounts;
  handleLike: (entityId: string) => Promise<void>;
  handleSave: (entityId: string) => Promise<void>;
  handleRepost: (entityId: string) => Promise<void>;
  updateCommentCount: (entityId: string, count: number) => void;
  liking: ReadonlySet<string>;
  saving: ReadonlySet<string>;
  reposting: ReadonlySet<string>;
}

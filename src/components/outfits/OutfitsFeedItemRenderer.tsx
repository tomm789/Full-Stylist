/**
 * OutfitsFeedItemRenderer Component
 * Wrapper around FeedItemComponent for Outfits social feeds.
 */

import React from 'react';
import { FeedItem } from '@/lib/posts';
import { FeedItemComponent } from '@/components/social';

type EngagementCounts = Record<
  string,
  {
    likes: number;
    saves: number;
    comments: number;
    reposts: number;
    hasLiked: boolean;
    hasSaved: boolean;
    hasReposted: boolean;
  }
>;

type OutfitsFeedItemRendererProps = {
  item: FeedItem;
  engagementCounts: EngagementCounts;
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, any>;
  currentUserId: string | undefined;
  onLike: (postId: string) => void;
  onComment: (item: FeedItem) => void;
  onRepost: (postId: string) => void;
  onSave: (postId: string) => Promise<void> | void;
  onFindSimilar: (
    entityType: 'wardrobe_item' | 'outfit',
    entityId: string,
    categoryId?: string
  ) => void;
  onMenuPress: (
    postId: string,
    position: { x: number; y: number; width: number; height: number }
  ) => void;
  onOpenSlideshow: (lookbookId: string) => void;
  menuButtonRefs: React.MutableRefObject<Map<string, any>>;
  menuButtonPositions: React.MutableRefObject<
    Map<string, { x: number; y: number; width: number; height: number }>
  >;
  openMenuPostId: string | null;
  setMenuButtonPosition: (position: { x: number; y: number; width: number; height: number } | null) => void;
  setOpenMenuPostId: (postId: string | null) => void;
};

export default function OutfitsFeedItemRenderer({
  item,
  engagementCounts,
  outfitImages,
  lookbookImages,
  currentUserId,
  onLike,
  onComment,
  onRepost,
  onSave,
  onFindSimilar,
  onMenuPress,
  onOpenSlideshow,
  menuButtonRefs,
  menuButtonPositions,
  openMenuPostId,
  setMenuButtonPosition,
  setOpenMenuPostId,
}: OutfitsFeedItemRendererProps) {
  return (
    <FeedItemComponent
      item={item}
      engagementCounts={engagementCounts}
      outfitImages={outfitImages}
      lookbookImages={lookbookImages}
      currentUserId={currentUserId}
      onLike={onLike}
      onComment={onComment}
      onRepost={onRepost}
      onSave={onSave}
      onFindSimilar={onFindSimilar}
      onMenuPress={onMenuPress}
      onOpenSlideshow={onOpenSlideshow}
      menuButtonRefs={menuButtonRefs}
      menuButtonPositions={menuButtonPositions}
      openMenuPostId={openMenuPostId}
      setMenuButtonPosition={setMenuButtonPosition}
      setOpenMenuPostId={setOpenMenuPostId}
    />
  );
}

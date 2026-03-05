/**
 * OutfitsFeedItemRenderer Component
 * Wrapper around FeedItemComponent for Outfits social feeds.
 * Performs per-item lookups from collection props so FeedItemComponent
 * receives stable primitives that work with React.memo.
 */

import React from 'react';
import { FeedItem } from '@/lib/posts';
import { FeedItemComponent, EngagementData } from '@/components/social/FeedItem';

type EngagementCounts = Record<string, EngagementData>;

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
  // Per-item lookups from collections → stable primitives for React.memo
  const post = item.type === 'post' ? item.post : item.repost?.original_post;
  const entity = item.entity?.outfit || item.entity?.lookbook;

  const engagement = post ? engagementCounts[post.id] : undefined;
  const outfitImageUrl = entity ? (outfitImages.get(entity.id) ?? null) : null;
  const outfitImageLoading = entity ? !outfitImages.has(entity.id) : false;

  return (
    <FeedItemComponent
      item={item}
      engagement={engagement}
      outfitImageUrl={outfitImageUrl}
      outfitImageLoading={outfitImageLoading}
      headshotImageUrl={null}
      headshotImageLoading={false}
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

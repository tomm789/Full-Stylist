import { useMemo } from 'react';
import type { FeedItem } from '@/lib/posts';

export type UsePostMenuContextParams = {
  activeFeedItems: FeedItem[];
  openMenuPostId: string | null;
  followStatuses: Map<string, boolean>;
};

export function usePostMenuContext({
  activeFeedItems,
  openMenuPostId,
  followStatuses,
}: UsePostMenuContextParams) {
  return useMemo(() => {
    if (!openMenuPostId) {
      return { feedItem: null, isFollowingOwner: false } as const;
    }

    const selectedItem = activeFeedItems.find(
      (item) =>
        (item.type === 'post' && item.post?.id === openMenuPostId) ||
        (item.type === 'repost' && item.repost?.original_post?.id === openMenuPostId)
    );

    const ownerUserId =
      selectedItem?.type === 'post'
        ? selectedItem.post?.owner_user_id
        : selectedItem?.repost?.original_post?.owner_user_id;

    const isFollowingOwner = ownerUserId
      ? followStatuses.get(ownerUserId) || false
      : false;

    return {
      feedItem: selectedItem || null,
      isFollowingOwner,
    } as const;
  }, [activeFeedItems, followStatuses, openMenuPostId]);
}

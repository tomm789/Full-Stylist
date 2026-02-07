import { useCallback } from 'react';
import type { OutfitScheduleStatus } from '@/types/outfits';
import type { Outfit } from '@/lib/outfits';
import { MyOutfitFeedItem, MyOutfitGridItem } from '@/components/outfits';

export type UseMyOutfitsRenderersParams = {
  imageCache: Map<string, string | null>;
  getScheduleInfo: (outfitId: string) => {
    overlayLabel: string;
    statusLabel: string;
    status: OutfitScheduleStatus | null;
  };
  selectionMode: boolean;
  selectedOutfitIds: Set<string>;
  toggleOutfitSelection: (outfitId: string, imageUrl?: string | null) => void;
  onOpenFeed: (outfitId: string) => void;
  onActivateSelection: () => void;
  onOpenMenu: (outfitId: string) => void;
  onPressOutfit: (outfitId: string) => void;
  onSchedulePress: (outfitId: string) => void;
  userId?: string;
};

export function useMyOutfitsRenderers({
  imageCache,
  getScheduleInfo,
  selectionMode,
  selectedOutfitIds,
  toggleOutfitSelection,
  onOpenFeed,
  onActivateSelection,
  onOpenMenu,
  onPressOutfit,
  onSchedulePress,
  userId,
}: UseMyOutfitsRenderersParams) {
  const renderGridItem = useCallback(
    ({ item }: { item: Outfit }) => {
      const imageUrl = imageCache.get(item.id) ?? null;
      const imageLoading = !imageCache.has(item.id);
      const scheduleInfo = getScheduleInfo(item.id);
      const isSelected = selectedOutfitIds.has(item.id);

      return (
        <MyOutfitGridItem
          item={item}
          imageUrl={imageUrl}
          imageLoading={imageLoading}
          scheduleInfo={scheduleInfo}
          isSelected={isSelected}
          selectionMode={selectionMode}
          onSelect={toggleOutfitSelection}
          onOpenFeed={onOpenFeed}
          onActivateSelection={onActivateSelection}
        />
      );
    },
    [
      getScheduleInfo,
      imageCache,
      onActivateSelection,
      onOpenFeed,
      selectedOutfitIds,
      selectionMode,
      toggleOutfitSelection,
    ]
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: Outfit }) => {
      const imageLoading = !imageCache.has(item.id);
      const imageUrl = imageCache.get(item.id) ?? null;
      const scheduleInfo = getScheduleInfo(item.id);

      return (
        <MyOutfitFeedItem
          item={item}
          imageUrl={imageUrl}
          imageLoading={imageLoading}
          scheduleInfo={scheduleInfo}
          userId={userId}
          onOpenMenu={onOpenMenu}
          onPressOutfit={onPressOutfit}
          onComment={onPressOutfit}
          onSchedulePress={onSchedulePress}
        />
      );
    },
    [
      getScheduleInfo,
      imageCache,
      onOpenMenu,
      onPressOutfit,
      onSchedulePress,
      userId,
    ]
  );

  return { renderGridItem, renderFeedItem };
}

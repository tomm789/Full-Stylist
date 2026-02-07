import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FeedItem } from '@/lib/posts';

type OutfitsTab = 'my_outfits' | 'explore' | 'following';

type UseOutfitsDerivedFiltersParams<TOutfit> = {
  activeTab: OutfitsTab;
  filteredOutfits: TOutfit[];
  exploreOutfitFeed: FeedItem[];
  followingOutfitFeed: FeedItem[];
  selectedOccasions: string[];
  setSelectedOccasions: Dispatch<SetStateAction<string[]>>;
  showFavoritesOnly: boolean;
  savedOutfitIds: Set<string>;
  getOutfitId: (outfit: TOutfit) => string;
  getOutfitOccasions: (outfit: TOutfit) => string[] | undefined;
};

export function useOutfitsDerivedFilters<TOutfit>({
  activeTab,
  filteredOutfits,
  exploreOutfitFeed,
  followingOutfitFeed,
  selectedOccasions,
  setSelectedOccasions,
  showFavoritesOnly,
  savedOutfitIds,
  getOutfitId,
  getOutfitOccasions,
}: UseOutfitsDerivedFiltersParams<TOutfit>) {
  const availableOccasions = useMemo(() => {
    const items =
      activeTab === 'my_outfits'
        ? filteredOutfits
        : activeTab === 'explore'
          ? exploreOutfitFeed
          : followingOutfitFeed;
    const occasionSet = new Set<string>();

    if (activeTab === 'my_outfits') {
      (items as TOutfit[]).forEach((outfit) => {
        getOutfitOccasions(outfit)?.forEach((occasion) => occasionSet.add(occasion));
      });
    } else {
      (items as FeedItem[]).forEach((item) => {
        const outfit = item.entity?.outfit as { occasions?: string[] } | undefined;
        outfit?.occasions?.forEach((occasion) => occasionSet.add(occasion));
      });
    }

    return Array.from(occasionSet).sort((a, b) => a.localeCompare(b));
  }, [activeTab, filteredOutfits, exploreOutfitFeed, followingOutfitFeed, getOutfitOccasions]);

  const toggleOccasion = useCallback((occasion: string) => {
    setSelectedOccasions((prev) =>
      prev.includes(occasion)
        ? prev.filter((value) => value !== occasion)
        : [...prev, occasion]
    );
  }, [setSelectedOccasions]);

  const filteredOutfitsWithOccasions = useMemo(() => {
    const base = showFavoritesOnly
      ? filteredOutfits.filter((outfit) => savedOutfitIds.has(getOutfitId(outfit)))
      : filteredOutfits;

    if (selectedOccasions.length === 0) return base;
    return base.filter((outfit) =>
      getOutfitOccasions(outfit)?.some((occasion) => selectedOccasions.includes(occasion))
    );
  }, [
    filteredOutfits,
    getOutfitId,
    getOutfitOccasions,
    selectedOccasions,
    showFavoritesOnly,
    savedOutfitIds,
  ]);

  return {
    availableOccasions,
    toggleOccasion,
    filteredOutfitsWithOccasions,
  };
}

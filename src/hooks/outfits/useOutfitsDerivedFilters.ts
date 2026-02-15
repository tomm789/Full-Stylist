import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FeedItem } from '@/lib/posts';
import { normalizeLabel, normalizeLabelKey } from '@/lib/outfits/normalizeLabels';

type OutfitsTab = 'my_outfits' | 'explore' | 'following';

type UseOutfitsDerivedFiltersParams<TOutfit> = {
  activeTab: OutfitsTab;
  allOutfits: TOutfit[];
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
  allOutfits,
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
  const popularOccasionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (allOutfits || []).forEach((outfit) => {
      getOutfitOccasions(outfit)?.forEach((occasion) => {
        const key = normalizeLabelKey(occasion);
        if (!key) return;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
    return counts;
  }, [allOutfits, getOutfitOccasions]);

  const availableOccasions = useMemo(() => {
    const items =
      activeTab === 'my_outfits'
        ? filteredOutfits
        : activeTab === 'explore'
          ? exploreOutfitFeed
          : followingOutfitFeed;
    const occasionMap = new Map<string, string>();

    if (activeTab === 'my_outfits') {
      (items as TOutfit[]).forEach((outfit) => {
        getOutfitOccasions(outfit)?.forEach((occasion) => {
          const key = normalizeLabelKey(occasion);
          if (!key || occasionMap.has(key)) return;
          occasionMap.set(key, normalizeLabel(occasion));
        });
      });
    } else {
      (items as FeedItem[]).forEach((item) => {
        const outfit = item.entity?.outfit as { occasions?: string[] } | undefined;
        outfit?.occasions?.forEach((occasion) => {
          const key = normalizeLabelKey(occasion);
          if (!key || occasionMap.has(key)) return;
          occasionMap.set(key, normalizeLabel(occasion));
        });
      });
    }

    return Array.from(occasionMap.values()).sort((a, b) => {
      const aCount = popularOccasionCounts.get(normalizeLabelKey(a)) ?? 0;
      const bCount = popularOccasionCounts.get(normalizeLabelKey(b)) ?? 0;
      if (aCount !== bCount) return bCount - aCount;
      return a.localeCompare(b);
    });
  }, [
    activeTab,
    filteredOutfits,
    exploreOutfitFeed,
    followingOutfitFeed,
    getOutfitOccasions,
    popularOccasionCounts,
  ]);

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
    const selectedKeys = new Set(selectedOccasions.map(normalizeLabelKey).filter(Boolean));
    return base.filter((outfit) =>
      getOutfitOccasions(outfit)?.some((occasion) =>
        selectedKeys.has(normalizeLabelKey(occasion))
      )
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

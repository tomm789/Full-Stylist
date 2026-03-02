import { useCallback } from 'react';

interface OutfitFilters {
  searchQuery: string;
  showFavoritesOnly: boolean;
  sortBy: string;
  sortOrder: string;
}

interface UseOutfitNavigationRouter {
  push: (path: string) => void;
}

export function useOutfitNavigation(
  router: UseOutfitNavigationRouter,
  filteredOutfits: Array<{ id: string }>,
  filters: OutfitFilters,
  getSortLabel: () => string
) {
  const handleOutfitPress = useCallback(
    (outfitId: string) => {
      const outfitIds = filteredOutfits.map((outfit) => outfit.id).join(',');
      const activeFilters: string[] = [];

      if (filters.searchQuery.trim()) {
        activeFilters.push(`Search: "${filters.searchQuery.trim()}"`);
      }
      if (filters.showFavoritesOnly) {
        activeFilters.push('Favorites');
      }
      if (filters.sortBy !== 'date' || filters.sortOrder !== 'desc') {
        activeFilters.push(`Sort: ${getSortLabel()}`);
      }

      const filterSummary = activeFilters.join(' • ');
      const queryParts = [`outfitIds=${encodeURIComponent(outfitIds)}`];
      if (filterSummary) {
        queryParts.push(`filters=${encodeURIComponent(filterSummary)}`);
      }

      router.push(`/outfits/${outfitId}/view?${queryParts.join('&')}`);
    },
    [router, filteredOutfits, filters, getSortLabel]
  );

  return { handleOutfitPress };
}

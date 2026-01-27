/**
 * useOutfitFilters Hook
 * Manages outfit filtering and sorting state
 */

import { useState, useMemo } from 'react';
import { OutfitWithRating } from '@/lib/outfits';

export type SortOption = 'date' | 'rating' | 'title';
export type SortOrder = 'asc' | 'desc';

interface FilterState {
  searchQuery: string;
  showFavoritesOnly: boolean;
  sortBy: SortOption;
  sortOrder: SortOrder;
}

export function useOutfitFilters(outfits: OutfitWithRating[]) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    showFavoritesOnly: false,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const filteredOutfits = useMemo(() => {
    let result = [...outfits];

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (outfit) =>
          outfit.title?.toLowerCase().includes(query) ||
          outfit.notes?.toLowerCase().includes(query)
      );
    }

    // Apply favorites filter
    if (filters.showFavoritesOnly) {
      result = result.filter((outfit) => outfit.is_favorite);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case 'rating':
          comparison = (b.rating || 0) - (a.rating || 0);
          break;
        case 'title':
          comparison = (a.title || '').localeCompare(b.title || '');
          break;
      }

      return filters.sortOrder === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [outfits, filters]);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      showFavoritesOnly: false,
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchQuery.trim() !== '' ||
      filters.showFavoritesOnly ||
      filters.sortBy !== 'date' ||
      filters.sortOrder !== 'desc'
    );
  }, [filters]);

  const getSortLabel = () => {
    const labels: Record<SortOption, string> = {
      date: 'Date',
      rating: 'Rating',
      title: 'Title',
    };
    return `${labels[filters.sortBy]} (${filters.sortOrder === 'asc' ? 'Asc' : 'Desc'})`;
  };

  return {
    filters,
    filteredOutfits,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    getSortLabel,
  };
}

export default useOutfitFilters;

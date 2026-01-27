/**
 * useFilters Hook
 * Manages filter state and filtered items
 */

import { useState, useMemo } from 'react';
import { WardrobeItem } from '@/lib/wardrobe';

export interface FilterState {
  subcategoryId: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  season: string | null;
  tagIds: string[];
  favorites: boolean | null;
  showSavedItemsOnly: boolean | null;
}

const initialFilterState: FilterState = {
  subcategoryId: null,
  color: null,
  material: null,
  size: null,
  season: null,
  tagIds: [],
  favorites: null,
  showSavedItemsOnly: null,
};

export function useFilters(allItems: WardrobeItem[], userId: string | null) {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);

  // Apply filters to items
  const filteredItems = useMemo(() => {
    let filtered = [...allItems];

    // Subcategory filter
    if (filters.subcategoryId) {
      filtered = filtered.filter((item) => item.subcategory_id === filters.subcategoryId);
    }

    // Color filter
    if (filters.color) {
      const filterColor = filters.color.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.color_primary?.toLowerCase() === filterColor ||
          (item.color_palette &&
            typeof item.color_palette === 'object' &&
            JSON.stringify(item.color_palette).toLowerCase().includes(filterColor))
      );
    }

    // Material filter
    if (filters.material) {
      filtered = filtered.filter((item) => {
        if (!item.material) return false;
        const materialStr =
          typeof item.material === 'string'
            ? item.material
            : JSON.stringify(item.material);
        return materialStr.toLowerCase().includes(filters.material!.toLowerCase());
      });
    }

    // Size filter
    if (filters.size) {
      filtered = filtered.filter((item) => {
        if (!item.size) return false;
        const sizeStr = typeof item.size === 'string' ? item.size : JSON.stringify(item.size);
        return sizeStr.toLowerCase().includes(filters.size!.toLowerCase());
      });
    }

    // Season filter
    if (filters.season) {
      filtered = filtered.filter((item) => {
        if (!item.seasonality) return false;
        const seasonStr =
          typeof item.seasonality === 'string'
            ? item.seasonality
            : JSON.stringify(item.seasonality);
        return seasonStr.toLowerCase().includes(filters.season!.toLowerCase());
      });
    }

    // Favorites filter
    if (filters.favorites !== null) {
      filtered = filtered.filter((item) => item.is_favorite === filters.favorites);
    }

    // Show only saved items from friends' wardrobes
    if (filters.showSavedItemsOnly === true && userId) {
      filtered = filtered.filter((item) => item.owner_user_id !== userId);
    }

    // Tags filter (placeholder - requires additional query)
    if (filters.tagIds.length > 0) {
      // Would need to implement tag link checking
      filtered = filtered.filter((item) => true);
    }

    return filtered;
  }, [allItems, filters, userId]);

  // Get available filter values from items
  const availableColors = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.color_primary) values.add(item.color_primary);
    });
    return Array.from(values).filter((v) => v).slice(0, 20);
  }, [allItems]);

  const availableMaterials = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.material) {
        const str = typeof item.material === 'string' ? item.material : JSON.stringify(item.material);
        if (str) values.add(str);
      }
    });
    return Array.from(values).filter((v) => v).slice(0, 10);
  }, [allItems]);

  const availableSizes = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.size) {
        const str = typeof item.size === 'string' ? item.size : JSON.stringify(item.size);
        if (str) values.add(str);
      }
    });
    return Array.from(values).filter((v) => v).slice(0, 10);
  }, [allItems]);

  const availableSeasons = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.seasonality) {
        const str = typeof item.seasonality === 'string' ? item.seasonality : JSON.stringify(item.seasonality);
        if (str) values.add(str);
      }
    });
    return Array.from(values).filter((v) => v).slice(0, 10);
  }, [allItems]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.subcategoryId !== null ||
      filters.color !== null ||
      filters.material !== null ||
      filters.size !== null ||
      filters.season !== null ||
      filters.tagIds.length > 0 ||
      filters.favorites !== null ||
      filters.showSavedItemsOnly === true
    );
  }, [filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters(initialFilterState);
  };

  // Update a single filter
  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return {
    filters,
    filteredItems,
    setFilters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    availableColors,
    availableMaterials,
    availableSizes,
    availableSeasons,
  };
}

export default useFilters;

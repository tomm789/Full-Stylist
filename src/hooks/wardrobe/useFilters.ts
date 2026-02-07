/**
 * useFilters Hook
 * Manages filter state and filtered items
 */

import { useState, useMemo } from 'react';
import { WardrobeItem } from '@/lib/wardrobe';

// --- Types ---

export interface FilterState {
  subcategoryId: string | null;
  color: string | null;
  material: string | null;
  size: string | null;
  season: string | null;
  brand: string | null;
  condition: string | null;
  entityAttributes: Record<string, string | null>;
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
  brand: null,
  condition: null,
  entityAttributes: {},
  tagIds: [],
  favorites: null,
  showSavedItemsOnly: null,
};

export interface AvailableEntityAttribute {
  key: string;
  name: string;
  values: string[];
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  worn: 'Worn',
};

// --- Utilities ---

/**
 * Extract individual string values from a JSONB field.
 * Handles: string, string[], object with string values, nested arrays.
 */
function extractJsonbValues(field: any): string[] {
  if (!field) return [];
  if (typeof field === 'string') return [field];
  if (Array.isArray(field)) {
    return field.flatMap((item) => {
      if (typeof item === 'string') return [item];
      if (typeof item === 'object' && item !== null) {
        return Object.values(item).filter((v): v is string => typeof v === 'string');
      }
      return [];
    });
  }
  if (typeof field === 'object') {
    return Object.values(field).filter((v): v is string => typeof v === 'string');
  }
  return [String(field)];
}

// --- Hook ---

export function useFilters(
  allItems: WardrobeItem[],
  userId: string | null,
  entityAttributesMap?: Map<string, any[]>,
  tagsMap?: Map<string, Array<{ id: string; name: string }>>,
) {
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
      const filterMaterial = filters.material.toLowerCase();
      filtered = filtered.filter((item) => {
        const values = extractJsonbValues(item.material);
        return values.some((v) => v.toLowerCase() === filterMaterial);
      });
    }

    // Size filter
    if (filters.size) {
      const filterSize = filters.size.toLowerCase();
      filtered = filtered.filter((item) => {
        const values = extractJsonbValues(item.size);
        return values.some((v) => v.toLowerCase() === filterSize);
      });
    }

    // Season filter
    if (filters.season) {
      const filterSeason = filters.season.toLowerCase();
      filtered = filtered.filter((item) => {
        const values = extractJsonbValues(item.seasonality);
        return values.some((v) => v.toLowerCase() === filterSeason);
      });
    }

    // Brand filter
    if (filters.brand) {
      filtered = filtered.filter((item) => item.brand === filters.brand);
    }

    // Condition filter
    if (filters.condition) {
      filtered = filtered.filter((item) => item.condition === filters.condition);
    }

    // Favorites filter
    if (filters.favorites !== null) {
      filtered = filtered.filter((item) => item.is_favorite === filters.favorites);
    }

    // Show only saved items from friends' wardrobes
    if (filters.showSavedItemsOnly === true && userId) {
      filtered = filtered.filter((item) => item.owner_user_id !== userId);
    }

    // Entity attribute filters
    const activeEntityFilters = Object.entries(filters.entityAttributes)
      .filter(([_, value]) => value !== null);

    if (activeEntityFilters.length > 0 && entityAttributesMap) {
      filtered = filtered.filter((item) => {
        const itemAttrs = entityAttributesMap.get(item.id) || [];
        return activeEntityFilters.every(([defKey, filterValue]) => {
          return itemAttrs.some((attr: any) => {
            const attrKey = attr.attribute_definitions?.key;
            const attrValue = attr.raw_value || attr.attribute_values?.value;
            return attrKey === defKey && attrValue?.toLowerCase() === filterValue?.toLowerCase();
          });
        });
      });
    }

    // Tags filter
    if (filters.tagIds.length > 0 && tagsMap) {
      filtered = filtered.filter((item) => {
        const itemTags = tagsMap.get(item.id) || [];
        const itemTagIds = itemTags.map((t) => t.id);
        return filters.tagIds.some((tagId) => itemTagIds.includes(tagId));
      });
    }

    return filtered;
  }, [allItems, filters, userId, entityAttributesMap, tagsMap]);

  // --- Extract available filter values from items ---

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
      extractJsonbValues(item.material).forEach((v) => {
        if (v.trim()) values.add(v.trim());
      });
    });
    return Array.from(values).sort().slice(0, 20);
  }, [allItems]);

  const availableSizes = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      extractJsonbValues(item.size).forEach((v) => {
        if (v.trim()) values.add(v.trim());
      });
    });
    return Array.from(values).sort().slice(0, 20);
  }, [allItems]);

  const availableSeasons = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      extractJsonbValues(item.seasonality).forEach((v) => {
        if (v.trim()) values.add(v.trim());
      });
    });
    return Array.from(values).sort().slice(0, 10);
  }, [allItems]);

  const availableBrands = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.brand?.trim()) values.add(item.brand.trim());
    });
    return Array.from(values).sort().slice(0, 20);
  }, [allItems]);

  const availableConditions = useMemo(() => {
    const values = new Set<string>();
    allItems.forEach((item) => {
      if (item.condition) values.add(item.condition);
    });
    return Array.from(values)
      .filter((v) => v)
      .map((v) => ({ id: v, label: CONDITION_LABELS[v] || v }));
  }, [allItems]);

  // Entity attribute available values (pattern, style, occasion, formality, etc.)
  const availableEntityAttributes = useMemo<AvailableEntityAttribute[]>(() => {
    if (!entityAttributesMap || entityAttributesMap.size === 0) return [];

    // Skip keys already handled as direct columns
    const skipKeys = new Set(['color', 'material', 'season']);

    const defMap = new Map<string, { name: string; values: Set<string> }>();

    entityAttributesMap.forEach((attrs) => {
      attrs.forEach((attr: any) => {
        const def = attr.attribute_definitions;
        if (!def) return;
        const key = def.key;
        if (skipKeys.has(key)) return;

        if (!defMap.has(key)) {
          defMap.set(key, { name: def.name || key, values: new Set() });
        }
        const rawValue = attr.raw_value || attr.attribute_values?.value;
        if (rawValue?.trim()) {
          defMap.get(key)!.values.add(rawValue.trim());
        }
      });
    });

    return Array.from(defMap.entries())
      .map(([key, { name, values }]) => ({
        key,
        name,
        values: Array.from(values).sort().slice(0, 20),
      }))
      .filter((attr) => attr.values.length > 0);
  }, [entityAttributesMap]);

  // Available tags
  const availableTags = useMemo(() => {
    if (!tagsMap || tagsMap.size === 0) return [];
    const tagSet = new Map<string, string>();
    tagsMap.forEach((tags) => {
      tags.forEach((tag) => {
        if (!tagSet.has(tag.id)) {
          tagSet.set(tag.id, tag.name);
        }
      });
    });
    return Array.from(tagSet.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tagsMap]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.subcategoryId !== null ||
      filters.color !== null ||
      filters.material !== null ||
      filters.size !== null ||
      filters.season !== null ||
      filters.brand !== null ||
      filters.condition !== null ||
      filters.tagIds.length > 0 ||
      filters.favorites !== null ||
      filters.showSavedItemsOnly === true ||
      Object.values(filters.entityAttributes).some((v) => v !== null)
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
    availableBrands,
    availableConditions,
    availableEntityAttributes,
    availableTags,
  };
}

export default useFilters;

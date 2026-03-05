import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WardrobeCategory,
  WardrobeItem,
  WardrobeSubcategory,
} from '@/lib/wardrobe';
import { useCategories } from './useCategories';
import { useWardrobeItems } from './useWardrobeItems';

interface UseWardrobeBrowserOptions {
  /** The wardrobe to browse */
  wardrobeId: string | null;
  /** The current user ID */
  userId: string | null;
  /** Optional: pre-select this category when the modal opens */
  initialCategoryId?: string | null;
  /** Whether the modal is visible (controls data loading) */
  enabled: boolean;
}

interface UseWardrobeBrowserReturn {
  categories: WardrobeCategory[];
  subcategories: WardrobeSubcategory[];
  selectedCategoryId: string | null;
  selectedSubcategoryId: string | null;
  selectCategory: (categoryId: string | null) => void;
  selectSubcategory: (subcategoryId: string | null) => void;

  items: WardrobeItem[];
  imageCache: Map<string, string | null>;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;

  reset: () => void;
}

export function useWardrobeBrowser({
  wardrobeId,
  userId,
  initialCategoryId = null,
  enabled,
}: UseWardrobeBrowserOptions): UseWardrobeBrowserReturn {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategoryId,
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    string | null
  >(null);
  const wasEnabledRef = useRef(enabled);

  const { categories, subcategories, loadSubcategories } = useCategories();
  const {
    allItems,
    imageCache,
    loading,
    refreshing,
    refresh,
  } = useWardrobeItems({
    wardrobeId,
    userId,
    categoryId: selectedCategoryId || undefined,
    autoLoad: enabled,
  });

  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    } else {
      loadSubcategories('');
    }

    setSelectedSubcategoryId(null);
  }, [selectedCategoryId, loadSubcategories]);

  // Sync category when the modal opens or when initialCategoryId changes while open.
  // Using a layout-phase effect to minimize the frame of stale state.
  useEffect(() => {
    const isOpening = enabled && !wasEnabledRef.current;
    if (isOpening) {
      // Always reset to initialCategoryId on open (even if null → show all)
      setSelectedCategoryId(initialCategoryId);
      setSelectedSubcategoryId(null);
    }
    wasEnabledRef.current = enabled;
  }, [enabled, initialCategoryId]);

  const items = useMemo(() => {
    if (!selectedSubcategoryId) {
      return allItems;
    }
    return allItems.filter(
      (item) => item.subcategory_id === selectedSubcategoryId,
    );
  }, [allItems, selectedSubcategoryId]);

  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  const selectSubcategory = useCallback((subcategoryId: string | null) => {
    setSelectedSubcategoryId(subcategoryId);
  }, []);

  const reset = useCallback(() => {
    setSelectedCategoryId(initialCategoryId);
    setSelectedSubcategoryId(null);
  }, [initialCategoryId]);

  return {
    categories,
    subcategories,
    selectedCategoryId,
    selectedSubcategoryId,
    selectCategory,
    selectSubcategory,
    items,
    imageCache,
    loading,
    refreshing,
    refresh,
    reset,
  };
}

export default useWardrobeBrowser;

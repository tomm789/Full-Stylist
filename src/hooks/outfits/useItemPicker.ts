/**
 * useItemPicker Hook
 * Manages item selection state for the outfit editor.
 * Works with WardrobeBrowserModal — the modal handles its own data loading,
 * so this hook only tracks selection state + wardrobe ID.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { WardrobeItem } from '@/lib/wardrobe';

interface UseItemPickerProps {
  user: { id: string } | null;
  outfitItems: Map<string, WardrobeItem>;
  setOutfitItems: Dispatch<SetStateAction<Map<string, WardrobeItem>>>;
  ensureItemImageUrls: (itemIds: string[]) => Promise<void>;
}

export interface UseItemPickerReturn {
  showBrowser: boolean;
  setShowBrowser: (show: boolean) => void;
  selectedCategory: string | null;
  wardrobeId: string | null;
  selectedItemIds: string[];
  openBrowser: (categoryId?: string) => void;
  selectItem: (item: WardrobeItem) => Promise<void>;
  removeItem: (categoryId: string) => void;
}

export function useItemPicker({
  user,
  outfitItems,
  setOutfitItems,
  ensureItemImageUrls,
}: UseItemPickerProps): UseItemPickerReturn {
  const [showBrowser, setShowBrowser] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [wardrobeId, setWardrobeId] = useState<string | null>(null);

  // Fetch default wardrobe ID once on mount
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { getDefaultWardrobeId } = await import('@/lib/wardrobe');
      const { data } = await getDefaultWardrobeId(user.id);
      if (!cancelled && data) setWardrobeId(data);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Derive selected item IDs for highlighting in the browser modal
  const selectedItemIds = useMemo(
    () => Array.from(outfitItems.values()).map((item) => item.id),
    [outfitItems]
  );

  const openBrowser = useCallback(
    (categoryId?: string) => {
      setSelectedCategory(categoryId ?? null);
      setShowBrowser(true);
    },
    []
  );

  const selectItem = useCallback(
    async (item: WardrobeItem) => {
      // If opened for a specific category, place item in that slot
      // Otherwise, use the item's own category_id
      const catId = selectedCategory || item.category_id;
      if (!catId) return;

      setOutfitItems((prev) => {
        const updated = new Map(prev);
        updated.set(catId, item);
        return updated;
      });

      await ensureItemImageUrls([item.id]);
      setShowBrowser(false);
      setSelectedCategory(null);
    },
    [selectedCategory, setOutfitItems, ensureItemImageUrls]
  );

  const removeItem = useCallback(
    (categoryId: string) => {
      setOutfitItems((prev) => {
        const updated = new Map(prev);
        updated.delete(categoryId);
        return updated;
      });
    },
    [setOutfitItems]
  );

  return {
    showBrowser,
    setShowBrowser,
    selectedCategory,
    wardrobeId,
    selectedItemIds,
    openBrowser,
    selectItem,
    removeItem,
  };
}

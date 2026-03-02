import { useState, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getWardrobeItems, getSavedWardrobeItems, WardrobeItem } from '@/lib/wardrobe';

interface UseItemPickerProps {
  user: { id: string } | null;
  setOutfitItems: Dispatch<SetStateAction<Map<string, WardrobeItem>>>;
  ensureItemImageUrls: (itemIds: string[]) => Promise<void>;
}

export interface UseItemPickerReturn {
  showItemPicker: boolean;
  selectedCategory: string | null;
  categoryItems: WardrobeItem[];
  setShowItemPicker: (show: boolean) => void;
  openItemPicker: (categoryId: string) => Promise<void>;
  selectItem: (item: WardrobeItem) => Promise<void>;
  removeItem: (categoryId: string) => void;
}

export function useItemPicker({
  user,
  setOutfitItems,
  ensureItemImageUrls,
}: UseItemPickerProps): UseItemPickerReturn {
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryItems, setCategoryItems] = useState<WardrobeItem[]>([]);

  const openItemPicker = useCallback(
    async (categoryId: string) => {
      if (!user) return;

      setSelectedCategory(categoryId);

      const { getDefaultWardrobeId } = await import('@/lib/wardrobe');
      const { data: defaultWardrobeId } = await getDefaultWardrobeId(user.id);
      if (!defaultWardrobeId) return;

      const { data: ownedItems } = await getWardrobeItems(defaultWardrobeId, {
        category_id: categoryId,
      });
      const { data: savedItems } = await getSavedWardrobeItems(user.id, {
        category_id: categoryId,
      });

      const items = [...(ownedItems || []), ...(savedItems || [])];
      setCategoryItems(items);

      if (items.length > 0) {
        await ensureItemImageUrls(items.map((item) => item.id));
      }

      setShowItemPicker(true);
    },
    [user, ensureItemImageUrls]
  );

  const selectItem = useCallback(
    async (item: WardrobeItem) => {
      if (!selectedCategory) return;

      setOutfitItems((prev) => {
        const updated = new Map(prev);
        updated.set(selectedCategory, item);
        return updated;
      });

      await ensureItemImageUrls([item.id]);
      setShowItemPicker(false);
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
    showItemPicker,
    selectedCategory,
    categoryItems,
    setShowItemPicker,
    openItemPicker,
    selectItem,
    removeItem,
  };
}

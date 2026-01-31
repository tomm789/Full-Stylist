/**
 * useOutfitEditor Hook
 * Manage outfit editing state and operations
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { getOutfit, saveOutfit } from '@/lib/outfits';
import {
  getWardrobeCategories,
  getWardrobeItemsByIds,
  getWardrobeItemImages,
  getWardrobeItemsImages,
  WardrobeCategory,
  WardrobeItem,
} from '@/lib/wardrobe';
import { getDefaultWardrobeId } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

interface UseOutfitEditorProps {
  outfitId: string | undefined;
  userId: string | undefined;
  itemsParam?: string;
}

interface UseOutfitEditorReturn {
  loading: boolean;
  outfit: any | null;
  title: string;
  notes: string;
  categories: WardrobeCategory[];
  outfitItems: Map<string, WardrobeItem>;
  itemImageUrls: Map<string, string>;
  coverImage: any | null;
  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  setOutfitItems: (items: Map<string, WardrobeItem>) => void;
  saveOutfit: () => Promise<string | null>;
  refreshOutfit: () => Promise<void>;
  getItemImageUrl: (itemId: string) => Promise<string | null>;
  ensureItemImageUrls: (itemIds: string[]) => Promise<void>;
}

export function useOutfitEditor({
  outfitId,
  userId,
  itemsParam,
}: UseOutfitEditorProps): UseOutfitEditorReturn {
  const [loading, setLoading] = useState(true);
  const [outfit, setOutfit] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [outfitItems, setOutfitItems] = useState<Map<string, WardrobeItem>>(
    new Map()
  );
  const [itemImageUrls, setItemImageUrls] = useState<Map<string, string>>(
    new Map()
  );
  const [coverImage, setCoverImage] = useState<any | null>(null);

  const getPublicImageUrl = (image: any): string | null => {
    if (!image?.storage_key) return null;
    const { data: urlData } = supabase.storage
      .from(image.storage_bucket || 'media')
      .getPublicUrl(image.storage_key);
    return urlData?.publicUrl ?? null;
  };

  const getItemImageUrl = async (itemId: string): Promise<string | null> => {
    const { data } = await getWardrobeItemImages(itemId);
    if (data && data.length > 0) {
      const imageData = data[0].image;
      return getPublicImageUrl(imageData);
    }
    return null;
  };

  const ensureItemImageUrls = async (itemIds: string[]): Promise<void> => {
    if (itemIds.length === 0) return;
    const missingIds = itemIds.filter((itemId) => !itemImageUrls.has(itemId));
    if (missingIds.length === 0) return;

    const { data: imagesMap } = await getWardrobeItemsImages(missingIds);
    if (!imagesMap || imagesMap.size === 0) return;

    setItemImageUrls((prev) => {
      const next = new Map(prev);
      imagesMap.forEach((images, itemId) => {
        if (next.has(itemId)) return;
        const firstImage = images?.[0]?.image;
        const imageUrl = getPublicImageUrl(firstImage);
        if (imageUrl) {
          next.set(itemId, imageUrl);
        }
      });
      return next;
    });
  };

  const saveOutfitAction = async (): Promise<string | null> => {
    if (!userId) return null;

    const items = Array.from(outfitItems.entries()).map(
      ([categoryId, item], index) => ({
        category_id: categoryId || null,
        wardrobe_item_id: item.id,
        position: index,
      })
    );

    const { data, error } = await saveOutfit(
      userId,
      {
        id: outfitId === 'new' ? undefined : outfit?.id,
        title: title.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      items
    );

    if (error) {
      Alert.alert('Error', error.message || 'Failed to save outfit');
      return null;
    }

    if (data) {
      setOutfit(data.outfit);
      return data.outfit.id;
    }

    return null;
  };

  const refreshOutfit = async () => {
    if (!outfitId || outfitId === 'new' || !userId) return;

    const { data, error } = await getOutfit(outfitId);
    if (error || !data) {
      return;
    }

    setOutfit(data.outfit);
    setTitle(data.outfit.title || '');
    setNotes(data.outfit.notes || '');
    setCoverImage(data.coverImage);

    if (data.items.length > 0) {
      const wardrobeItemIds = data.items.map((oi) => oi.wardrobe_item_id);
      const { data: wardrobeItems } = await getWardrobeItemsByIds(
        wardrobeItemIds
      );
      if (wardrobeItems) {
        const wardrobeItemsById = new Map(
          wardrobeItems.map((wi) => [wi.id, wi])
        );
        const itemsMap = new Map<string, WardrobeItem>();
        for (const outfitItem of data.items) {
          const item = wardrobeItemsById.get(outfitItem.wardrobe_item_id);
          if (item) {
            itemsMap.set(outfitItem.category_id, item);
          }
        }
        setOutfitItems(itemsMap);
        await ensureItemImageUrls(Array.from(itemsMap.values()).map((item) => item.id));
      }
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      setLoading(true);

      // Load categories
      const { data: categoriesData } = await getWardrobeCategories();
      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Handle preselected items
      if (outfitId === 'new' && itemsParam && userId) {
        const itemIds = itemsParam.split(',');
        const { data: preselectedItems } = await getWardrobeItemsByIds(itemIds);

        if (preselectedItems && preselectedItems.length > 0) {
          const itemsMap = new Map<string, WardrobeItem>();
          const itemIds: string[] = [];

          for (const item of preselectedItems) {
            if (item.category_id) {
              itemsMap.set(item.category_id, item);
            }
            itemIds.push(item.id);
          }

          setOutfitItems(itemsMap);
          await ensureItemImageUrls(itemIds);
        }
      }

      // Load existing outfit
      if (outfitId && outfitId !== 'new') {
        await refreshOutfit();
      }

      setLoading(false);
    };

    initialize();
  }, [outfitId, userId, itemsParam]);

  return {
    loading,
    outfit,
    title,
    notes,
    categories,
    outfitItems,
    itemImageUrls,
    coverImage,
    setTitle,
    setNotes,
    setOutfitItems,
    saveOutfit: saveOutfitAction,
    refreshOutfit,
    getItemImageUrl,
    ensureItemImageUrls,
  };
}

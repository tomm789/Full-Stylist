/**
 * useWardrobeItemData Hook
 * Load and refresh wardrobe item data (item, category, images, attributes, tags)
 */

import { useState, useCallback } from 'react';
import {
  getWardrobeItem,
  getWardrobeItemImages,
  getCachedWardrobeCategories,
  WardrobeItem,
  WardrobeCategory,
} from '@/lib/wardrobe';
import { getEntityAttributes } from '@/lib/attributes';
import { supabase } from '@/lib/supabase';

interface UseWardrobeItemDataProps {
  itemId: string | undefined;
}

interface UseWardrobeItemDataReturn {
  item: WardrobeItem | null;
  category: WardrobeCategory | null;
  allImages: Array<{ id: string; image_id: string; type: string; image: any }>;
  displayImages: Array<{ id: string; image_id: string; type: string; image: any }>;
  attributes: any[];
  tags: Array<{ id: string; name: string }>;
  setItem: (item: WardrobeItem | null) => void;
  setCategory: (category: WardrobeCategory | null) => void;
  setAllImages: (images: Array<{ id: string; image_id: string; type: string; image: any }>) => void;
  setDisplayImages: (images: Array<{ id: string; image_id: string; type: string; image: any }>) => void;
  setAttributes: (attributes: any[]) => void;
  setTags: (tags: Array<{ id: string; name: string }>) => void;
  refreshImages: () => Promise<void>;
  refreshAttributes: () => Promise<void>;
  loadItemData: () => Promise<void>;
}

export function useWardrobeItemData({
  itemId,
}: UseWardrobeItemDataProps): UseWardrobeItemDataReturn {
  const [item, setItem] = useState<WardrobeItem | null>(null);
  const [category, setCategory] = useState<WardrobeCategory | null>(null);
  const [allImages, setAllImages] = useState<
    Array<{ id: string; image_id: string; type: string; image: any }>
  >([]);
  const [displayImages, setDisplayImages] = useState<
    Array<{ id: string; image_id: string; type: string; image: any }>
  >([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);

  const refreshImages = useCallback(async () => {
    if (!itemId) return;

    const { data: refreshedImages } = await getWardrobeItemImages(itemId);
    const { data: itemAttributes } = await getEntityAttributes(
      'wardrobe_item',
      itemId
    );

    if (refreshedImages) {
      setAllImages(refreshedImages);
      const filtered = refreshedImages.filter(
        (img) => img.type === 'original' || img.type === 'product_shot'
      );
      setDisplayImages(filtered);

      if (itemAttributes) {
        setAttributes(itemAttributes);
      }
    }
  }, [itemId]);

  const refreshAttributes = useCallback(async () => {
    if (!itemId) return;

    const { data: itemAttributes } = await getEntityAttributes(
      'wardrobe_item',
      itemId
    );
    if (itemAttributes && itemAttributes.length > 0) {
      setAttributes(itemAttributes);
      const { data: refreshedItem } = await getWardrobeItem(itemId);
      if (refreshedItem) {
        setItem(refreshedItem);
        if (refreshedItem.category_id) {
          const { data: categories } = await getCachedWardrobeCategories();
          const foundCategory = categories?.find(
            (c) => c.id === refreshedItem.category_id
          );
          if (foundCategory) {
            setCategory(foundCategory);
          }
        }
      }
    }
  }, [itemId]);

  const loadItemData = useCallback(async () => {
    if (!itemId) return;

    try {
      // Run all 5 queries in parallel — they only need itemId
      const [itemResult, categoriesResult, imagesResult, attrsResult, tagsResult] = await Promise.all([
        getWardrobeItem(itemId),
        getCachedWardrobeCategories(),
        getWardrobeItemImages(itemId),
        getEntityAttributes('wardrobe_item', itemId),
        supabase
          .from('tag_links')
          .select('*, tags(id, name)')
          .eq('entity_type', 'wardrobe_item')
          .eq('entity_id', itemId),
      ]);

      if (itemResult.error) throw itemResult.error;

      const foundItem = itemResult.data;
      let foundCategory: WardrobeCategory | null = null;
      if (foundItem && categoriesResult.data) {
        foundCategory = categoriesResult.data.find(
          (c) => c.id === foundItem.category_id
        ) || null;
      }

      const itemImages = imagesResult.data || [];
      const filtered = itemImages.filter(
        (img) => img.type === 'original' || img.type === 'product_shot'
      );

      const itemAttributes = attrsResult.data || [];

      const itemTags = tagsResult.data
        ? tagsResult.data
            .map((link: any) => link.tags)
            .filter((tag: any) => tag)
            .map((tag: any) => ({ id: tag.id, name: tag.name }))
        : [];

      // Set ALL state in one synchronous tick — React batches into one render
      setItem(foundItem);
      setCategory(foundCategory);
      setAllImages(itemImages);
      setDisplayImages(filtered);
      setAttributes(itemAttributes);
      setTags(itemTags);
    } catch (error: any) {
      console.error('Failed to load item data:', error);
      throw error;
    }
  }, [itemId]);

  return {
    item,
    category,
    allImages,
    displayImages,
    attributes,
    tags,
    setItem,
    setCategory,
    setAllImages,
    setDisplayImages,
    setAttributes,
    setTags,
    refreshImages,
    refreshAttributes,
    loadItemData,
  };
}

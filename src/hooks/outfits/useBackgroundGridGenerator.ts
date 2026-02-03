/**
 * useBackgroundGridGenerator
 * Pre-generates and uploads the outfit grid image while the user selects items,
 * so when they click "Generate" the grid is ready (0s latency) or nearly ready.
 *
 * Gated by EXPO_PUBLIC_PREGEND_GRID === 'true' (default OFF). When false, no
 * grid generation or upload runs; can be re-enabled later.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadBase64ImageToStorage } from '@/lib/utils/image-helpers';
import { generateClothingGrid } from '@/utils/clothing-grid';
import type { WardrobeItem } from '@/lib/wardrobe';

const PREGEND_GRID_ENABLED =
  typeof process !== 'undefined' && process.env.EXPO_PUBLIC_PREGEND_GRID === 'true';

const DEBOUNCE_MS = 2000;
const STORAGE_PREFIX = 'background-preview';

function selectionKey(items: WardrobeItem[]): string {
  return items.map((i) => i.id).join(',');
}

export interface BackgroundGridResult {
  /** Storage path (e.g. userId/ai/stacked/background-preview-123.jpg) when ready; null until upload completes */
  preUploadedGridKey: string | null;
  /** Selection key for which preUploadedGridKey was produced */
  selectionKeyForStored: string | null;
  /** True while background upload is in progress */
  isUploading: boolean;
  /** For submit: use stored key if it matches current selection, else await pending upload and return key if match, else null */
  getStoredKeyOrAwaitPending: (currentSelectionKey: string) => Promise<string | null>;
}

export function useBackgroundGridGenerator(
  selectedItems: WardrobeItem[],
  userId: string | null
): BackgroundGridResult {
  const [preUploadedGridKey, setPreUploadedGridKey] = useState<string | null>(null);
  const [selectionKeyForStored, setSelectionKeyForStored] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);
  const pendingUploadPromiseRef = useRef<Promise<{ key: string; selectionKey: string }> | null>(null);

  const performUpload = useCallback(
    async (items: WardrobeItem[], runId: number): Promise<{ key: string; selectionKey: string } | null> => {
      if (!userId || items.length === 0) return null;

      const currentSelectionKey = selectionKey(items);

      try {
        const wardrobeItemIds = items.map((item) => item.id);
        const { data: imageLinks, error: linksError } = await supabase
          .from('wardrobe_item_images')
          .select(
            `
            image_id,
            wardrobe_item_id,
            type,
            sort_order,
            images!inner(storage_key)
          `
          )
          .in('wardrobe_item_id', wardrobeItemIds);

        if (linksError || !imageLinks || imageLinks.length === 0) return null;

        const flattenedLinks = imageLinks.map((link: any) => ({
          image_id: link.image_id,
          wardrobe_item_id: link.wardrobe_item_id,
          type: link.type,
          sort_order: link.sort_order,
          storage_key: link.images?.storage_key,
        }));

        const imagesByItem = new Map<string, typeof flattenedLinks>();
        flattenedLinks.forEach((link: any) => {
          if (!imagesByItem.has(link.wardrobe_item_id)) {
            imagesByItem.set(link.wardrobe_item_id, []);
          }
          imagesByItem.get(link.wardrobe_item_id)!.push(link);
        });

        const topImages: any[] = [];
        wardrobeItemIds.forEach((itemId) => {
          const images = imagesByItem.get(itemId);
          if (!images || images.length === 0) return;
          images.sort((a: any, b: any) => {
            if (a.type === 'product_shot' && b.type !== 'product_shot') return -1;
            if (b.type === 'product_shot' && a.type !== 'product_shot') return 1;
            return (a.sort_order || 999) - (b.sort_order || 999);
          });
          topImages.push(images[0]);
        });

        if (topImages.length === 0) return null;

        const imageUrls = topImages.map((link: any) => {
          const { data: urlData } = supabase.storage.from('media').getPublicUrl(link.storage_key);
          return urlData?.publicUrl ?? '';
        }).filter(Boolean);

        if (imageUrls.length === 0) return null;

        const gridBase64 = await generateClothingGrid(imageUrls);

        const timestamp = Date.now();
        const fileName = `${STORAGE_PREFIX}-${timestamp}.jpg`;
        const storagePath = `${userId}/ai/stacked/${fileName}`;
        const { data: uploadDataResult, error: uploadError } = await uploadBase64ImageToStorage(
          'media',
          storagePath,
          gridBase64,
          'image/jpeg'
        );

        if (uploadError || !uploadDataResult) {
          console.warn('[BackgroundGrid] Upload failed:', uploadError?.message);
          return null;
        }

        return { key: uploadDataResult.path, selectionKey: currentSelectionKey };
      } catch (err) {
        console.warn('[BackgroundGrid] Error:', err);
        return null;
      } finally {
        if (runIdRef.current === runId) {
          setIsUploading(false);
        }
      }
    },
    [userId]
  );

  useEffect(() => {
    if (!PREGEND_GRID_ENABLED || !userId || selectedItems.length === 0) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setPreUploadedGridKey(null);
      setSelectionKeyForStored(null);
      setIsUploading(false);
      pendingUploadPromiseRef.current = null;
      return;
    }

    const currentKey = selectionKey(selectedItems);
    runIdRef.current += 1;
    const thisRunId = runIdRef.current;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (runIdRef.current !== thisRunId) return;

      setIsUploading(true);
      const promise = performUpload(selectedItems, thisRunId).then((result) => {
        pendingUploadPromiseRef.current = null;
        if (runIdRef.current !== thisRunId) return null;
        if (result) {
          setPreUploadedGridKey(result.key);
          setSelectionKeyForStored(result.selectionKey);
          return result;
        }
        return null;
      });
      pendingUploadPromiseRef.current = promise;
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [userId, selectedItems, performUpload]);

  const getStoredKeyOrAwaitPending = useCallback(
    async (currentSelectionKey: string): Promise<string | null> => {
      if (!PREGEND_GRID_ENABLED) return null;
      if (preUploadedGridKey && selectionKeyForStored === currentSelectionKey) {
        return preUploadedGridKey;
      }
      const pending = pendingUploadPromiseRef.current;
      if (pending) {
        const result = await pending;
        return result?.selectionKey === currentSelectionKey ? result.key : null;
      }
      return null;
    },
    [preUploadedGridKey, selectionKeyForStored]
  );

  // Reset stored key when selection changes so we don't reuse for wrong set
  useEffect(() => {
    const currentKey = selectionKey(selectedItems);
    if (selectionKeyForStored && selectionKeyForStored !== currentKey) {
      setPreUploadedGridKey(null);
      setSelectionKeyForStored(null);
    }
  }, [selectedItems, selectionKeyForStored]);

  return {
    preUploadedGridKey,
    selectionKeyForStored,
    isUploading,
    getStoredKeyOrAwaitPending,
  };
}

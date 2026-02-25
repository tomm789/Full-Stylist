/**
 * generateAndUploadGrid
 * Shared utility: generates a clothing grid image from pre-resolved image URLs
 * and uploads it to Supabase storage. Returns null if client-side generation
 * is unavailable or fails, allowing callers to fall back to server stacking.
 */

import { Platform } from 'react-native';
import { generateClothingGrid } from '@/utils/clothing-grid';
import { uploadBase64ImageToStorage } from '@/lib/utils/image-helpers';
import { supabase } from '@/lib/supabase';
import type { OutfitCanvasLayoutMap } from '@/lib/outfits/canvasLayout';

export interface GridResult {
  imageId: string;
  publicUrl: string;
  storagePath: string;
}

interface GenerateAndUploadGridOptions {
  /** Item IDs in the same order as imageUrls, required for custom canvas layouts. */
  itemIds?: string[];
  /** Per-item canvas layout overrides. Only applied when itemIds is also provided. */
  layoutByItemId?: OutfitCanvasLayoutMap | null;
}

/**
 * Generates a stacked clothing grid on the client (web only) and uploads it
 * to `{userId}/ai/stacked/grid-{timestamp}.jpg` in the `media` bucket.
 *
 * Returns null when:
 * - Not running in a web environment
 * - Grid generation throws
 * - Supabase upload fails
 */
export async function generateAndUploadGrid(
  imageUrls: string[],
  userId: string,
  options?: GenerateAndUploadGridOptions
): Promise<GridResult | null> {
  const canClientStack =
    Platform.OS === 'web' &&
    typeof document !== 'undefined' &&
    typeof Image !== 'undefined';

  if (!canClientStack) {
    console.warn('[generateAndUploadGrid] Client-side grid generation unavailable; skipping');
    return null;
  }

  const { itemIds, layoutByItemId } = options ?? {};
  const hasCustomLayout = Boolean(
    itemIds && itemIds.length > 0 &&
    layoutByItemId && Object.keys(layoutByItemId).length > 0
  );

  try {
    const gridBase64 = await generateClothingGrid(
      imageUrls,
      hasCustomLayout && itemIds
        ? { itemIds, layoutByItemId: layoutByItemId ?? undefined }
        : undefined
    );

    const storagePath = `${userId}/ai/stacked/grid-${Date.now()}.jpg`;

    const { data: uploadResult, error: uploadError } = await uploadBase64ImageToStorage(
      'media',
      storagePath,
      gridBase64,
      'image/jpeg'
    );

    if (uploadError || !uploadResult) {
      throw new Error(`Upload failed: ${uploadError?.message ?? 'Unknown error'}`);
    }

    const publicUrl = supabase.storage
      .from('media')
      .getPublicUrl(uploadResult.path).data.publicUrl;

    return {
      imageId: uploadResult.path,
      publicUrl,
      storagePath: uploadResult.path,
    };
  } catch (error) {
    console.warn('[generateAndUploadGrid] Failed:', error);
    return null;
  }
}

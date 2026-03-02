/**
 * generateAndUploadGrid
 * Shared utility: generates a clothing grid image from pre-resolved image URLs
 * and uploads it to Supabase storage. Returns null if client-side generation
 * is unavailable or fails, allowing callers to fall back to server stacking.
 */

import { Platform } from 'react-native';
import { generateClothingGrid } from '@/utils/clothing-grid';
import {
  uploadBase64ImageToStorage,
  uploadBytesToStorage,
} from '@/lib/utils/image-helpers';
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
 * Generates a stacked clothing grid on the client and uploads it
 * to `{userId}/ai/stacked/grid-{timestamp}.jpg` in the `media` bucket.
 *
 * Uses HTML5 Canvas on web, Skia offscreen surfaces on native iOS/Android.
 * Metro resolves the correct platform-specific `clothing-grid` module.
 *
 * On native, decodes the base64 to bytes in-memory and uploads directly
 * (skips the temp-file round-trip used by uploadBase64ImageToStorage).
 *
 * Returns null when grid generation or upload fails,
 * allowing callers to fall back to server-side stacking.
 */
export async function generateAndUploadGrid(
  imageUrls: string[],
  userId: string,
  options?: GenerateAndUploadGridOptions
): Promise<GridResult | null> {
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

    // On native, skip the temp-file round-trip: decode base64 → bytes → upload directly.
    // On web, the existing base64 upload path (atob → Uint8Array) is already efficient.
    let uploadResult: { path: string; fullPath: string } | null = null;
    let uploadError: any = null;

    if (Platform.OS !== 'web') {
      // Decode base64 to binary in-memory (avoids writing to disk)
      const binaryStr = globalThis.atob(gridBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const result = await uploadBytesToStorage('media', storagePath, bytes, 'image/jpeg');
      uploadResult = result.data;
      uploadError = result.error;
    } else {
      const result = await uploadBase64ImageToStorage('media', storagePath, gridBase64, 'image/jpeg');
      uploadResult = result.data;
      uploadError = result.error;
    }

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

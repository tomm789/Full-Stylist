/**
 * Client-only cache for passing wardrobe item preview data from grid to detail page
 * so the detail page can render item title, brand, and cover image instantly
 * while fetching full data (images, attributes, tags) in the background.
 */

import type { WardrobeItem } from './items-types';

interface ItemPreview {
  item: WardrobeItem;
  imageUrl: string | null;
  cachedAt: number;
}

const previewCache = new Map<string, ItemPreview>();
const PREVIEW_TTL_MS = 60 * 1000; // 1 minute (only needs to survive navigation)

/**
 * Store preview data before navigating to item detail.
 */
export function setItemPreview(
  itemId: string,
  item: WardrobeItem,
  imageUrl: string | null
): void {
  previewCache.set(itemId, {
    item,
    imageUrl,
    cachedAt: Date.now(),
  });
}

/**
 * Consume preview data on item detail mount (read-once).
 * Returns null if no preview or if TTL expired.
 */
export function getItemPreview(itemId: string): ItemPreview | null {
  const entry = previewCache.get(itemId);
  if (!entry) return null;

  // Consume on read
  previewCache.delete(itemId);

  // Check TTL
  if (Date.now() - entry.cachedAt > PREVIEW_TTL_MS) {
    return null;
  }

  return entry;
}

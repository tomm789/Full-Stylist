/**
 * Image Prefetching
 * Warms expo-image's disk cache for off-screen images.
 */

import { Image } from 'expo-image';

/**
 * Prefetch a batch of image URLs into expo-image's disk cache.
 * Silently ignores null/undefined URLs and fetch failures.
 */
export function prefetchImages(urls: (string | null | undefined)[]): void {
  const validUrls = urls.filter((u): u is string => !!u);
  validUrls.forEach((url) => {
    Image.prefetch(url).catch(() => {});
  });
}

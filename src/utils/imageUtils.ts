/**
 * Image Utilities
 * Helper functions for image operations
 */

import { supabase } from '@/lib/supabase';

/**
 * Get public URL for an image from storage
 */
export function getImagePublicUrl(
  storageKey: string,
  bucket: string = 'media'
): string | null {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storageKey);
    return data?.publicUrl || null;
  } catch (error) {
    console.error('Error getting image public URL:', error);
    return null;
  }
}

/**
 * Get public URLs for multiple images
 */
export function getImagePublicUrls(
  images: Array<{ storage_key: string; storage_bucket?: string }>
): Map<string, string | null> {
  const urlMap = new Map<string, string | null>();

  images.forEach((image) => {
    const url = getImagePublicUrl(image.storage_key, image.storage_bucket);
    urlMap.set(image.storage_key, url);
  });

  return urlMap;
}

/**
 * Convert URI to Blob for image uploads (handles file:// on iOS)
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

/**
 * Get image dimensions from URI
 */
export async function getImageDimensions(
  uri: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      // React Native environment
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = uri;
  });
}

/**
 * Validate image file type
 */
export function isValidImageType(type: string): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return validTypes.includes(type.toLowerCase());
}

/**
 * Validate image file size (in bytes)
 */
export function isValidImageSize(size: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
}

/**
 * Get image aspect ratio
 */
export function getAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Calculate responsive image dimensions
 */
export function getResponsiveImageDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight?: number
): { width: number; height: number } {
  const aspectRatio = getAspectRatio(originalWidth, originalHeight);

  if (maxHeight) {
    // Fit within both max width and height
    const widthBasedHeight = maxWidth / aspectRatio;
    const heightBasedWidth = maxHeight * aspectRatio;

    if (widthBasedHeight <= maxHeight) {
      return { width: maxWidth, height: widthBasedHeight };
    } else {
      return { width: heightBasedWidth, height: maxHeight };
    }
  } else {
    // Fit within max width only
    return { width: maxWidth, height: maxWidth / aspectRatio };
  }
}

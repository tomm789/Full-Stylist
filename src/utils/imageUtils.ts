/**
 * Image Utilities
 * Helper functions for image validation and dimensions
 */

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
  if (!type || typeof type !== 'string') return false;
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

  let width = originalWidth;
  let height = originalHeight;

  // Scale down to fit maxWidth (never scale up)
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  // Scale down further to fit maxHeight if provided (never scale up)
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}

/**
 * Client-side image compression utility (Web)
 * Uses browser-image-compression for web platform
 */

import imageCompression from 'browser-image-compression';

/**
 * Compress an image file for upload (web only)
 */
export async function compressImageFile(file: File): Promise<File> {
  try {
    if (__DEV__) console.log('[compressImageFile] Starting compression:', {
      originalSize: file.size,
      originalType: file.type,
      originalName: file.name,
    });

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1536,
      useWebWorker: true,
      fileType: 'image/webp' as const,
    };

    const compressedFile = await imageCompression(file, options);

    if (__DEV__) console.log('[compressImageFile] Compression complete:', {
      originalSize: file.size,
      compressedSize: compressedFile.size,
      reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`,
    });

    return compressedFile;
  } catch (error) {
    console.error('[compressImageFile] Compression failed:', error);
    return file;
  }
}

type CompressedUriResult = {
  uri: string;
  mimeType: string;
  fileName: string;
};

/**
 * No-op on web — native compression uses expo-image-manipulator
 */
export async function compressImageUri(
  uri: string,
  mimeType: string,
  fileName: string
): Promise<CompressedUriResult> {
  return { uri, mimeType, fileName };
}

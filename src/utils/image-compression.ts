/**
 * Client-side image compression utility
 * Uses browser-image-compression for web platform
 */

import { Platform } from 'react-native';
import imageCompression from 'browser-image-compression';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress an image file for upload
 * Only works on web platform - returns original file on native
 * 
 * @param file - The image file to compress
 * @returns Compressed File object (or original on native)
 */
export async function compressImageFile(file: File): Promise<File> {
  // Only compress on web platform
  if (Platform.OS !== 'web') {
    console.log('[compressImageFile] Skipping compression on native platform');
    return file;
  }

  try {
    console.log('[compressImageFile] Starting compression:', {
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

    console.log('[compressImageFile] Compression complete:', {
      originalSize: file.size,
      compressedSize: compressedFile.size,
      reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`,
    });

    return compressedFile;
  } catch (error) {
    console.error('[compressImageFile] Compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}

type CompressedUriResult = {
  uri: string;
  mimeType: string;
  fileName: string;
};

function replaceExtension(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  return `${baseName}.${extension}`;
}

/**
 * Compress an image URI for native platforms.
 * Returns original input on web.
 */
export async function compressImageUri(
  uri: string,
  mimeType: string,
  fileName: string
): Promise<CompressedUriResult> {
  if (Platform.OS === 'web') {
    return { uri, mimeType, fileName };
  }

  const targetWidth = 1536;
  const format =
    mimeType === 'image/png'
      ? ImageManipulator.SaveFormat.PNG
      : ImageManipulator.SaveFormat.JPEG;
  const outputMimeType =
    format === ImageManipulator.SaveFormat.PNG ? 'image/png' : 'image/jpeg';
  const outputFileName =
    format === ImageManipulator.SaveFormat.PNG
      ? replaceExtension(fileName, 'png')
      : replaceExtension(fileName, 'jpg');

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: targetWidth } }],
    { compress: 0.8, format }
  );

  return {
    uri: result.uri,
    mimeType: outputMimeType,
    fileName: outputFileName,
  };
}

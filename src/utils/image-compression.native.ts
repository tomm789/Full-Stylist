/**
 * Client-side image compression utility (Native)
 * Uses expo-image-manipulator for native platforms
 */

import * as ImageManipulator from 'expo-image-manipulator';

/**
 * No-op on native — browser compression not available
 */
export async function compressImageFile(file: File): Promise<File> {
  return file;
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
 * Compress an image URI for native platforms
 */
export async function compressImageUri(
  uri: string,
  mimeType: string,
  fileName: string
): Promise<CompressedUriResult> {
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

/**
 * Base file for TypeScript resolution.
 * At runtime, Metro loads image-compression.web.ts or image-compression.native.ts instead.
 */

export async function compressImageFile(file: File): Promise<File> {
  return file;
}

type CompressedUriResult = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export async function compressImageUri(
  uri: string,
  mimeType: string,
  fileName: string
): Promise<CompressedUriResult> {
  return { uri, mimeType, fileName };
}

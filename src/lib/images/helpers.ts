import { Platform } from 'react-native';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import { supabase, SUPABASE_CONFIG } from '../supabase';
import { compressImageFile, compressImageUri } from './compression';

type UriUploadSource = {
  uri: string;
  mimeType: string;
};

type UploadSource = Blob | File | UriUploadSource;

const isUriUploadSource = (file: UploadSource): file is UriUploadSource => {
  return typeof file === 'object' && file !== null && 'uri' in file;
};

function replaceFileExtension(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  return `${baseName}.${extension}`;
}

/**
 * Get public URL for an image from Supabase storage
 */
export function getPublicImageUrl(
  image?: { storage_bucket?: string | null; storage_key?: string | null } | null
): string | null {
  if (!image?.storage_key) {
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(image.storage_bucket || 'media')
    .getPublicUrl(image.storage_key);

  return urlData.publicUrl;
}

/**
 * Get public URL from storage bucket and key
 */
export function getStorageUrl(bucket: string, key: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

/**
 * Convert image URI to Blob
 */
export async function uriToBlob(uri: string, mimeType: string): Promise<Blob> {
    if (__DEV__) console.log('[uriToBlob] Converting URI:', { uri: uri.substring(0, 50), mimeType });

  if (uri.startsWith('file://') && Platform.OS !== 'web') {
        if (__DEV__) console.log('[uriToBlob] Using FileSystem for file:// URI');
    const base64 = await LegacyFileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });

    const dataUrl = `data:${mimeType};base64,${base64}`;
    const response = await fetch(dataUrl);
    return await response.blob();
  }

    if (__DEV__) console.log('[uriToBlob] Using fetch for URI');
  const response = await fetch(uri);
  const blob = await response.blob();
    if (__DEV__) console.log('[uriToBlob] Created blob:', { size: blob.size, type: blob.type });
  return blob;
}

async function uploadUriToStorage(
  filePath: string,
  uri: string,
  mimeType: string,
  bucket: string
): Promise<{
  data: { path: string; fullPath: string } | null;
  error: any;
}> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return { data: null, error: sessionError };
    }

    const accessToken = sessionData?.session?.access_token || SUPABASE_CONFIG.anonKey;
    const uploadUrl = `${SUPABASE_CONFIG.url}/storage/v1/object/${bucket}/${filePath}`;

    const uploadResult = await LegacyFileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_CONFIG.anonKey,
        'Content-Type': mimeType,
        'x-upsert': 'false',
      },
    });

        if (__DEV__) console.log('[uploadUriToStorage] HTTP status:', uploadResult.status, 'body:', uploadResult.body?.substring(0, 200));
    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      return {
        data: null,
        error: new Error(`Upload failed with status ${uploadResult.status}: ${uploadResult.body}`),
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return { data: { path: filePath, fullPath: publicUrl }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Upload image to Supabase Storage
 * FIXED: Convert Blob to ArrayBuffer to avoid multipart form data issues
 */
export async function uploadImageToStorage(
  userId: string,
  file: UploadSource,
  fileName: string,
  bucket: string = 'media'
): Promise<{
  data: { path: string; fullPath: string } | null;
  error: any;
}> {
  try {
    const fileExt = fileName.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

        if (__DEV__) console.log('[uploadImageToStorage] Starting upload:', {
      userId,
      fileName,
      filePath,
      blobSize: isUriUploadSource(file) ? 'uri' : file.size,
      blobType: isUriUploadSource(file) ? file.mimeType : file.type,
      platform: Platform.OS,
    });

    if (Platform.OS !== 'web' && isUriUploadSource(file)) {
      const uploadResult = await uploadUriToStorage(filePath, file.uri, file.mimeType, bucket);
      return uploadResult;
    }

    // At this point, file is guaranteed to be Blob | File (not UriUploadSource)
    // because the UriUploadSource case returned early above
    const blobFile = file as Blob;

    // Convert Blob to ArrayBuffer to ensure raw binary upload
    // This prevents the multipart form data issue
        if (__DEV__) console.log('[uploadImageToStorage] Converting blob to ArrayBuffer...');
    const arrayBuffer = await blobFile.arrayBuffer();
        if (__DEV__) console.log('[uploadImageToStorage] ArrayBuffer size:', arrayBuffer.byteLength);

    // Verify it's a valid image
    const bytes = new Uint8Array(arrayBuffer);
    const isJPEG = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50;
    // WebP files start with "RIFF" (0x52 0x49 0x46 0x46) and have "WEBP" at offset 8
    const isWebP =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

        if (__DEV__) console.log(
      '[uploadImageToStorage] First bytes:',
      Array.from(bytes.slice(0, 12))
        .map((b) => '0x' + b.toString(16).padStart(2, '0'))
        .join(' ')
    );
        if (__DEV__) console.log('[uploadImageToStorage] Valid image format:', isJPEG || isPNG || isWebP);

    if (!isJPEG && !isPNG && !isWebP) {
      return {
        data: null,
        error: new Error('Invalid image format - must be JPEG, PNG, or WebP'),
      };
    }

    // Upload as ArrayBuffer (raw bytes)
        if (__DEV__) console.log('[uploadImageToStorage] Uploading to Supabase...');
    const { data, error } = await supabase.storage.from(bucket).upload(filePath, arrayBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: blobFile.type || 'image/webp',
    });

    if (error) {
      console.error('[uploadImageToStorage] Upload error:', error);
      return { data: null, error };
    }

        if (__DEV__) console.log('[uploadImageToStorage] Upload success:', data.path);

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { data: { path: data.path, fullPath: publicUrl }, error: null };
  } catch (error: any) {
    console.error('[uploadImageToStorage] Caught error:', error);
    return { data: null, error };
  }
}

/**
 * Create image record in database after upload
 */
export async function createImageRecord(
  userId: string,
  storagePath: string,
  mimeType: string,
  source: 'upload' | 'ai_generated' = 'upload',
  bucket: string = 'media'
): Promise<{
  data: { id: string } | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase
      .from('images')
      .insert({
        owner_user_id: userId,
        storage_bucket: bucket,
        storage_key: storagePath,
        mime_type: mimeType,
        source,
      })
      .select('id')
      .single();

    return { data, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Upload image and create database record in one operation
 */
export async function uploadAndCreateImage(
  userId: string,
  file: UploadSource,
  fileName: string,
  source: 'upload' | 'ai_generated' = 'upload',
  options?: { skipCompression?: boolean }
): Promise<{
  data: { imageId: string; path: string; url: string } | null;
  error: any;
}> {
  try {
    let uploadSource: UploadSource = file;
    let uploadFileName = fileName;
    let uploadMimeType = isUriUploadSource(file)
      ? file.mimeType
      : file.type || 'image/webp';

    // Compress raw user uploads before storage to reduce downstream AI latency.
    if (source === 'upload' && !options?.skipCompression) {
      if (isUriUploadSource(uploadSource) && Platform.OS !== 'web') {
        const compressed = await compressImageUri(
          uploadSource.uri,
          uploadSource.mimeType,
          uploadFileName
        );
        uploadSource = { uri: compressed.uri, mimeType: compressed.mimeType };
        uploadMimeType = compressed.mimeType;
        uploadFileName = compressed.fileName;
      } else if (!isUriUploadSource(uploadSource) && Platform.OS === 'web') {
        const inputFile =
          uploadSource instanceof File
            ? uploadSource
            : new File([uploadSource], uploadFileName, {
                type: uploadSource.type || uploadMimeType || 'image/jpeg',
              });
        const compressedFile = await compressImageFile(inputFile);
        uploadSource = compressedFile;
        uploadMimeType = compressedFile.type || uploadMimeType;
        if (uploadMimeType === 'image/webp') {
          uploadFileName = replaceFileExtension(uploadFileName, 'webp');
        } else if (uploadMimeType === 'image/png') {
          uploadFileName = replaceFileExtension(uploadFileName, 'png');
        } else if (uploadMimeType === 'image/jpeg') {
          uploadFileName = replaceFileExtension(uploadFileName, 'jpg');
        }
      }
    }

    const uploadResult = await uploadImageToStorage(userId, uploadSource, uploadFileName);
    if (uploadResult.error || !uploadResult.data) {
      return { data: null, error: uploadResult.error };
    }

    const imageResult = await createImageRecord(
      userId,
      uploadResult.data.path,
      uploadMimeType,
      source
    );

    if (imageResult.error || !imageResult.data) {
      return { data: null, error: imageResult.error };
    }

    return {
      data: {
        imageId: imageResult.data.id,
        path: uploadResult.data.path,
        url: uploadResult.data.fullPath,
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error };
  }
}

export async function uploadBase64ImageToStorage(
  bucket: string,
  storagePath: string,
  base64Data: string,
  mimeType: string
): Promise<{
  data: { path: string; fullPath: string } | null;
  error: any;
}> {
  try {
    if (Platform.OS !== 'web') {
      const fileName = storagePath.split('/').pop() || 'upload.jpg';
      const tempPath = `${LegacyFileSystem.cacheDirectory || LegacyFileSystem.documentDirectory}${fileName}`;

            if (__DEV__) console.log('[uploadBase64ImageToStorage] Native path:', { storagePath, tempPath, base64Length: base64Data.length, mimeType, bucket });

      await LegacyFileSystem.writeAsStringAsync(tempPath, base64Data, {
        encoding: LegacyFileSystem.EncodingType.Base64,
      });
            if (__DEV__) console.log('[uploadBase64ImageToStorage] Wrote temp file, uploading...');

      const result = await uploadUriToStorage(storagePath, tempPath, mimeType, bucket);
            if (__DEV__) console.log('[uploadBase64ImageToStorage] uploadUriToStorage result:', { path: result.data?.path, error: result.error });
      await LegacyFileSystem.deleteAsync(tempPath, { idempotent: true });
      return result;
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const { data, error } = await supabase.storage.from(bucket).upload(storagePath, byteArray, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType,
    });

    if (error || !data) {
      return { data: null, error: error || new Error('Upload failed') };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { data: { path: data.path, fullPath: publicUrl }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Upload raw bytes directly to Supabase storage (no temp file, no base64).
 * Preferred on native when binary data is already available (e.g., Skia encodeToBytes).
 */
export async function uploadBytesToStorage(
  bucket: string,
  storagePath: string,
  bytes: Uint8Array,
  mimeType: string
): Promise<{
  data: { path: string; fullPath: string } | null;
  error: any;
}> {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType,
    });

    if (error || !data) {
      return { data: null, error: error || new Error('Upload failed') };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return { data: { path: data.path, fullPath: publicUrl }, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Delete image from storage and database
 */
export async function deleteImage(imageId: string, userId: string): Promise<{ error: any }> {
  try {
    const { data: image } = await supabase
      .from('images')
      .select('storage_bucket, storage_key')
      .eq('id', imageId)
      .eq('owner_user_id', userId)
      .single();

    if (!image) {
      return { error: new Error('Image not found or access denied') };
    }

    const { error: storageError } = await supabase.storage
      .from(image.storage_bucket)
      .remove([image.storage_key]);

    if (storageError) {
            if (__DEV__) console.warn('Failed to delete from storage:', storageError);
    }

    const { error: dbError } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId)
      .eq('owner_user_id', userId);

    return { error: dbError };
  } catch (error: any) {
    return { error };
  }
}

/**
 * Batch upload images
 * Compresses images on web platform before upload
 */
export async function batchUploadImages(
  userId: string,
  files: Array<{ uri: string; type: string; name: string }>,
  source: 'upload' | 'ai_generated' = 'upload'
): Promise<{
  data: string[];
  errors: any[];
}> {
  const imageIds: string[] = [];
  const errors: any[] = [];

  for (const file of files) {
    try {
      let blob = await uriToBlob(file.uri, file.type);
      let fileName = file.name;
      let fileType = file.type;
      let uploadSource: UploadSource = blob;

      // Compress on web platform before upload
      if (Platform.OS === 'web' && source === 'upload') {
        try {
          // Capture original file metrics before compression
          const originalFileName = file.name;
          const originalSizeBytes = blob.size;
          const originalSizeMB = (originalSizeBytes / (1024 * 1024)).toFixed(2);

          // Start compression timer
          const compressionStartTime = performance.now();

          // Convert Blob to File for compression
          const fileObj = new File([blob], file.name, { type: file.type });
          const compressedFile = await compressImageFile(fileObj);

          // Calculate compression metrics
          const compressionEndTime = performance.now();
          const compressionTimeMs = (compressionEndTime - compressionStartTime).toFixed(0);
          const compressedSizeBytes = compressedFile.size;
          const compressedSizeMB = (compressedSizeBytes / (1024 * 1024)).toFixed(2);
          const sizeReductionBytes = originalSizeBytes - compressedSizeBytes;
          const sizeReductionPercent = ((sizeReductionBytes / originalSizeBytes) * 100).toFixed(1);

          // Update blob to compressed version
          blob = compressedFile;

          // Update file name to reflect WebP format after compression
          const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          fileName = `${fileNameWithoutExt}.webp`;
          fileType = 'image/webp';

          // Detailed compression logging
                    if (__DEV__) console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    if (__DEV__) console.log('📸 IMAGE COMPRESSION COMPLETE');
                    if (__DEV__) console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    if (__DEV__) console.log(`📁 Original File Name: ${originalFileName}`);
                    if (__DEV__) console.log(
            `📊 Original Size: ${originalSizeMB} MB (${originalSizeBytes.toLocaleString()} bytes)`
          );
                    if (__DEV__) console.log(
            `📊 Compressed Size: ${compressedSizeMB} MB (${compressedSizeBytes.toLocaleString()} bytes)`
          );
                    if (__DEV__) console.log(
            `💾 Size Reduction: ${sizeReductionPercent}% (Saved ${(
              sizeReductionBytes /
              (1024 * 1024)
            ).toFixed(2)} MB)`
          );
                    if (__DEV__) console.log(`⏱️  Compression Time: ${compressionTimeMs}ms`);
                    if (__DEV__) console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    if (__DEV__) console.log('🚀 Starting upload...');
        } catch (compressionError) {
                    if (__DEV__) console.warn('[batchUploadImages] Compression failed, using original:', compressionError);
          // Continue with original blob if compression fails
        }
      }

      if (Platform.OS !== 'web' && source === 'upload') {
        const compressed = await compressImageUri(file.uri, file.type, fileName);
        uploadSource = { uri: compressed.uri, mimeType: compressed.mimeType };
        fileName = compressed.fileName;
        fileType = compressed.mimeType;
      }

      const result = await uploadAndCreateImage(userId, uploadSource, fileName, source, {
        skipCompression: true,
      });

      if (result.error || !result.data) {
        errors.push({ file: fileName, error: result.error });
      } else {
        imageIds.push(result.data.imageId);
      }
    } catch (error: any) {
      errors.push({ file: file.name, error });
    }
  }

  return { data: imageIds, errors };
}

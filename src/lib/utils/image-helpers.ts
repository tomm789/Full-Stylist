import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabase';
import { compressImageFile } from '../../utils/image-compression';

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
  console.log('[uriToBlob] Converting URI:', { uri: uri.substring(0, 50), mimeType });
  
  if (uri.startsWith('file://') && Platform.OS !== 'web') {
    console.log('[uriToBlob] Using FileSystem for file:// URI');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const response = await fetch(dataUrl);
    return await response.blob();
  }
  
  console.log('[uriToBlob] Using fetch for URI');
  const response = await fetch(uri);
  const blob = await response.blob();
  console.log('[uriToBlob] Created blob:', { size: blob.size, type: blob.type });
  return blob;
}

/**
 * Upload image to Supabase Storage
 * FIXED: Convert Blob to ArrayBuffer to avoid multipart form data issues
 */
export async function uploadImageToStorage(
  userId: string,
  file: Blob | File,
  fileName: string,
  bucket: string = 'media'
): Promise<{
  data: { path: string; fullPath: string } | null;
  error: any;
}> {
  try {
    const fileExt = fileName.split('.').pop();
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    console.log('[uploadImageToStorage] Starting upload:', {
      userId,
      fileName,
      filePath,
      blobSize: file.size,
      blobType: file.type,
      platform: Platform.OS
    });

    // Convert Blob to ArrayBuffer to ensure raw binary upload
    // This prevents the multipart form data issue
    console.log('[uploadImageToStorage] Converting blob to ArrayBuffer...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('[uploadImageToStorage] ArrayBuffer size:', arrayBuffer.byteLength);
    
    // Verify it's a valid image
    const bytes = new Uint8Array(arrayBuffer);
    const isJPEG = bytes[0] === 0xFF && bytes[1] === 0xD8;
    const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50;
    // WebP files start with "RIFF" (0x52 0x49 0x46 0x46) and have "WEBP" at offset 8
    const isWebP = bytes.length >= 12 && 
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    console.log('[uploadImageToStorage] First bytes:', 
      Array.from(bytes.slice(0, 12)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
    console.log('[uploadImageToStorage] Valid image format:', isJPEG || isPNG || isWebP);

    if (!isJPEG && !isPNG && !isWebP) {
      return { 
        data: null, 
        error: new Error('Invalid image format - must be JPEG, PNG, or WebP') 
      };
    }

    // Upload as ArrayBuffer (raw bytes)
    console.log('[uploadImageToStorage] Uploading to Supabase...');
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/webp',
      });

    if (error) {
      console.error('[uploadImageToStorage] Upload error:', error);
      return { data: null, error };
    }

    console.log('[uploadImageToStorage] Upload success:', data.path);

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

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
  file: Blob | File,
  fileName: string,
  source: 'upload' | 'ai_generated' = 'upload'
): Promise<{
  data: { imageId: string; path: string; url: string } | null;
  error: any;
}> {
  try {
    const uploadResult = await uploadImageToStorage(userId, file, fileName);
    if (uploadResult.error || !uploadResult.data) {
      return { data: null, error: uploadResult.error };
    }

    const imageResult = await createImageRecord(
      userId,
      uploadResult.data.path,
      file.type || 'image/webp',
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

/**
 * Delete image from storage and database
 */
export async function deleteImage(
  imageId: string,
  userId: string
): Promise<{ error: any }> {
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
      console.warn('Failed to delete from storage:', storageError);
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
          file.name = `${fileNameWithoutExt}.webp`;
          file.type = 'image/webp';
          
          // Detailed compression logging
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('📸 IMAGE COMPRESSION COMPLETE');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`📁 Original File Name: ${originalFileName}`);
          console.log(`📊 Original Size: ${originalSizeMB} MB (${originalSizeBytes.toLocaleString()} bytes)`);
          console.log(`📊 Compressed Size: ${compressedSizeMB} MB (${compressedSizeBytes.toLocaleString()} bytes)`);
          console.log(`💾 Size Reduction: ${sizeReductionPercent}% (Saved ${(sizeReductionBytes / (1024 * 1024)).toFixed(2)} MB)`);
          console.log(`⏱️  Compression Time: ${compressionTimeMs}ms`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🚀 Starting upload...');
        } catch (compressionError) {
          console.warn('[batchUploadImages] Compression failed, using original:', compressionError);
          // Continue with original blob if compression fails
        }
      }
      
      const result = await uploadAndCreateImage(userId, blob, file.name, source);
      
      if (result.error || !result.data) {
        errors.push({ file: file.name, error: result.error });
      } else {
        imageIds.push(result.data.imageId);
      }
    } catch (error: any) {
      errors.push({ file: file.name, error });
    }
  }

  return { data: imageIds, errors };
}

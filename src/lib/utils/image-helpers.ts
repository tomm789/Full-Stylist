import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../supabase';

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
 * Convert base64 string to ArrayBuffer (for React Native compatibility)
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert image URI to Blob
 * Handles file:// URIs on native platforms using expo-file-system
 * Falls back to fetch() for web and other URI formats
 */
export async function uriToBlob(uri: string, mimeType: string): Promise<Blob> {
  // Check if this is a file:// URI on native platform
  if (uri.startsWith('file://') && Platform.OS !== 'web') {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const response = await fetch(dataUrl);
    return await response.blob();
  }
  
  // Use fetch for web (blob:, data:, http:) and other formats
  const response = await fetch(uri);
  return await response.blob();
}

/**
 * Upload image to Supabase Storage
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

    // For React Native, convert Blob to ArrayBuffer
    let uploadData: ArrayBuffer | Blob | File;
    if (Platform.OS !== 'web' && file instanceof Blob) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      uploadData = base64ToArrayBuffer(base64);
    } else {
      uploadData = file;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, uploadData, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });

    if (error) {
      return { data: null, error };
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { data: { path: data.path, fullPath: publicUrl }, error: null };
  } catch (error: any) {
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
    // Upload to storage
    const uploadResult = await uploadImageToStorage(userId, file, fileName);
    if (uploadResult.error || !uploadResult.data) {
      return { data: null, error: uploadResult.error };
    }

    // Create database record
    const imageResult = await createImageRecord(
      userId,
      uploadResult.data.path,
      file.type || 'image/jpeg',
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
    // Get image record
    const { data: image } = await supabase
      .from('images')
      .select('storage_bucket, storage_key')
      .eq('id', imageId)
      .eq('owner_user_id', userId)
      .single();

    if (!image) {
      return { error: new Error('Image not found or access denied') };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(image.storage_bucket)
      .remove([image.storage_key]);

    if (storageError) {
      console.warn('Failed to delete from storage:', storageError);
    }

    // Delete database record
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
 */
export async function batchUploadImages(
  userId: string,
  files: Array<{ uri: string; type: string; name: string }>,
  source: 'upload' | 'ai_generated' = 'upload'
): Promise<{
  data: string[]; // Array of image IDs
  errors: any[];
}> {
  const imageIds: string[] = [];
  const errors: any[] = [];

  for (const file of files) {
    try {
      const blob = await uriToBlob(file.uri, file.type);
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

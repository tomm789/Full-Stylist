/**
 * useImageStacker Hook
 * Custom React hook for stacking images and uploading to Supabase storage
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { processAndStackImages } from '@/utils/imageProcessor';

interface StackedImageResult {
  /** Storage path used as identifier when no images record is created */
  imageId: string;
  publicUrl: string;
  storagePath: string;
}

interface UseImageStackerReturn {
  stackAndUpload: (files: File[]) => Promise<StackedImageResult | null>;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook for stacking images and uploading to Supabase storage
 * Returns the image ID which can be used in AI job inputs
 * 
 * @returns Object containing stackAndUpload function, loading state, and error state
 */
export function useImageStacker(): UseImageStackerReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const stackAndUpload = useCallback(async (files: File[]): Promise<StackedImageResult | null> => {
    if (files.length === 0) {
      setError(new Error('No files provided'));
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[useImageStacker] Stacking ${files.length} images...`);

      // Get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Failed to get session: ${sessionError.message}`);
      }

      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }

      const userId = session.user.id;

      // Process and stack images using the utility function
      const stackedBlob = await processAndStackImages(files);
      console.log(`[useImageStacker] Images stacked successfully`);

      // Generate a unique filename
      const timestamp = Date.now();
      const fileName = `stacked-${timestamp}.jpg`;
      const storagePath = `${userId}/ai/stacked/${fileName}`;

      // Upload to Supabase storage bucket 'media'
      // Use Uint8Array to ensure raw binary upload in React Native
      const arrayBuffer = await stackedBlob.arrayBuffer();
      const uploadData = new Uint8Array(arrayBuffer);

      const { data: uploadDataResult, error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, uploadData, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      if (!uploadDataResult) {
        throw new Error('Upload succeeded but no data returned');
      }

      console.log(`[useImageStacker] Uploaded to storage: ${uploadDataResult.path}`);

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(uploadDataResult.path);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      console.log(`[useImageStacker] Upload complete, storage path: ${uploadDataResult.path}`);

      // We don't need to create an images record - the Netlify function can download
      // directly from storage using the storage_key. Return the path as the "imageId"
      setLoading(false);
      return {
        imageId: uploadDataResult.path, // Use storage path as ID
        publicUrl: urlData.publicUrl,
        storagePath: uploadDataResult.path
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setLoading(false);
      console.error('[useImageStacker] Error:', error);
      return null;
    }
  }, []);

  return {
    stackAndUpload,
    loading,
    error,
  };
}

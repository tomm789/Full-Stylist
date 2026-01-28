/**
 * useImageEdit Hook
 * Manage headshot and bodyshot editing, duplication, and deletion
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { updateUserSettings } from '@/lib/settings';

interface ImageDetails {
  id: string;
  url: string;
  originalSelfieId: string | null;
  originalHairStyle: string;
  originalMakeupStyle: string;
}

interface UseImageEditProps {
  imageId: string | undefined;
  userId: string | undefined;
  imageType: 'headshot' | 'bodyshot';
}

interface UseImageEditReturn {
  image: ImageDetails | null;
  loading: boolean;
  duplicating: boolean;
  deleting: boolean;
  refresh: () => Promise<void>;
  duplicate: () => Promise<string | null>;
  deleteImage: () => Promise<boolean>;
  setAsActive: () => Promise<boolean>;
}

export function useImageEdit({
  imageId,
  userId,
  imageType,
}: UseImageEditProps): UseImageEditReturn {
  const [image, setImage] = useState<ImageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadImage = async () => {
    if (!imageId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load image record
      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (imageError || !imageRecord) {
        throw new Error(`${imageType === 'headshot' ? 'Headshot' : 'Bodyshot'} not found`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(imageRecord.storage_bucket || 'media')
        .getPublicUrl(imageRecord.storage_key);

      // Find AI job that created this image
      const jobType = imageType === 'headshot' ? 'headshot_generate' : 'body_shot_generate';
      const { data: jobs } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('job_type', jobType)
        .order('created_at', { ascending: false })
        .limit(50);

      let originalSelfieId = null;
      let originalHairStyle = '';
      let originalMakeupStyle = '';

      if (jobs) {
        const job = jobs.find((j) => {
          if (j.status === 'succeeded') {
            const resultImageId = j.result?.image_id || j.result?.generated_image_id;
            return resultImageId === imageId;
          }
          return false;
        });

        if (job && job.input) {
          if (imageType === 'headshot') {
            originalSelfieId = job.input.selfie_image_id;
            originalHairStyle = job.input.hair_style || '';
            originalMakeupStyle = job.input.makeup_style || '';
          }
          // For bodyshots, we don't need these fields, but keeping structure consistent
        }
      }

      setImage({
        id: imageId,
        url: urlData.publicUrl,
        originalSelfieId,
        originalHairStyle,
        originalMakeupStyle,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to load ${imageType}`);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadImage();
  };

  const duplicate = async (): Promise<string | null> => {
    if (!userId || !image) return null;

    setDuplicating(true);

    try {
      // Fetch image as blob
      const response = await fetch(image.url);
      const blob = await response.blob();

      // Upload duplicate
      const timestamp = Date.now();
      const folder = imageType === 'headshot' ? 'headshots' : 'body_shots';
      const storagePath = `${userId}/ai/${folder}/${timestamp}.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create image record
      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: userId,
          storage_bucket: 'media',
          storage_key: uploadData.path,
          mime_type: 'image/jpeg',
          source: 'ai_generated',
        })
        .select()
        .single();

      if (imageError || !imageRecord) {
        throw imageError || new Error('Failed to create duplicate');
      }

      return imageRecord.id;
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to duplicate ${imageType}`);
      return null;
    } finally {
      setDuplicating(false);
    }
  };

  const deleteImage = async (): Promise<boolean> => {
    if (!userId || !imageId || !image) return false;

    setDeleting(true);

    try {
      // Get image record for storage key
      const { data: imageRecord } = await supabase
        .from('images')
        .select('storage_bucket, storage_key')
        .eq('id', imageId)
        .single();

      // Delete from storage
      if (imageRecord?.storage_key) {
        await supabase.storage
          .from(imageRecord.storage_bucket || 'media')
          .remove([imageRecord.storage_key]);
      }

      // Delete from images table
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId)
        .eq('owner_user_id', userId);

      if (error) throw error;

      // If this was the active image, clear it
      const field = imageType === 'headshot' ? 'headshot_image_id' : 'body_shot_image_id';
      const { data: settings } = await supabase
        .from('user_settings')
        .select(field)
        .eq('user_id', userId)
        .single();

      if (settings && settings[field] === imageId) {
        await updateUserSettings(userId, {
          [field]: null,
        } as any);
      }

      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to delete ${imageType}`);
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const setAsActive = async (): Promise<boolean> => {
    if (!userId || !imageId) return false;

    try {
      const field = imageType === 'headshot' ? 'headshot_image_id' : 'body_shot_image_id';
      const displayName = imageType === 'headshot' ? 'Headshot' : 'Studio model';
      
      const { error } = await updateUserSettings(userId, {
        [field]: imageId,
      } as any);

      if (error) throw error;

      Alert.alert('Success', `${displayName} set as active`);
      return true;
    } catch (error: any) {
      const displayName = imageType === 'headshot' ? 'headshot' : 'studio model';
      Alert.alert('Error', error.message || `Failed to set ${displayName} as active`);
      return false;
    }
  };

  useEffect(() => {
    loadImage();
  }, [imageId, userId, imageType]);

  return {
    image,
    loading,
    duplicating,
    deleting,
    refresh,
    duplicate,
    deleteImage,
    setAsActive,
  };
}

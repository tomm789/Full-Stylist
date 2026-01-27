/**
 * useHeadshotEdit Hook
 * Manage headshot editing, duplication, and deletion
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { updateUserSettings } from '@/lib/settings';

interface HeadshotDetails {
  id: string;
  url: string;
  originalSelfieId: string | null;
  originalHairStyle: string;
  originalMakeupStyle: string;
}

interface UseHeadshotEditProps {
  headshotId: string | undefined;
  userId: string | undefined;
}

interface UseHeadshotEditReturn {
  headshot: HeadshotDetails | null;
  loading: boolean;
  duplicating: boolean;
  deleting: boolean;
  refresh: () => Promise<void>;
  duplicate: () => Promise<string | null>;
  deleteHeadshot: () => Promise<boolean>;
  setAsActive: () => Promise<boolean>;
}

export function useHeadshotEdit({
  headshotId,
  userId,
}: UseHeadshotEditProps): UseHeadshotEditReturn {
  const [headshot, setHeadshot] = useState<HeadshotDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadHeadshot = async () => {
    if (!headshotId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load image record
      const { data: image, error: imageError } = await supabase
        .from('images')
        .select('*')
        .eq('id', headshotId)
        .single();

      if (imageError || !image) {
        throw new Error('Headshot not found');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(image.storage_bucket || 'media')
        .getPublicUrl(image.storage_key);

      // Find AI job that created this headshot
      const { data: jobs } = await supabase
        .from('ai_jobs')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('job_type', 'headshot_generate')
        .order('created_at', { ascending: false })
        .limit(50);

      let originalSelfieId = null;
      let originalHairStyle = '';
      let originalMakeupStyle = '';

      if (jobs) {
        const job = jobs.find((j) => {
          if (j.status === 'succeeded') {
            const imageId = j.result?.image_id || j.result?.generated_image_id;
            return imageId === headshotId;
          }
          return false;
        });

        if (job && job.input) {
          originalSelfieId = job.input.selfie_image_id;
          originalHairStyle = job.input.hair_style || '';
          originalMakeupStyle = job.input.makeup_style || '';
        }
      }

      setHeadshot({
        id: headshotId,
        url: urlData.publicUrl,
        originalSelfieId,
        originalHairStyle,
        originalMakeupStyle,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load headshot');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadHeadshot();
  };

  const duplicate = async (): Promise<string | null> => {
    if (!userId || !headshot) return null;

    setDuplicating(true);

    try {
      // Fetch image as blob
      const response = await fetch(headshot.url);
      const blob = await response.blob();

      // Upload duplicate
      const timestamp = Date.now();
      const storagePath = `${userId}/ai/headshots/${timestamp}.jpg`;

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
      Alert.alert('Error', error.message || 'Failed to duplicate headshot');
      return null;
    } finally {
      setDuplicating(false);
    }
  };

  const deleteHeadshot = async (): Promise<boolean> => {
    if (!userId || !headshotId || !headshot) return false;

    setDeleting(true);

    try {
      // Get image record for storage key
      const { data: image } = await supabase
        .from('images')
        .select('storage_bucket, storage_key')
        .eq('id', headshotId)
        .single();

      // Delete from storage
      if (image?.storage_key) {
        await supabase.storage
          .from(image.storage_bucket || 'media')
          .remove([image.storage_key]);
      }

      // Delete from images table
      const { error } = await supabase
        .from('images')
        .delete()
        .eq('id', headshotId)
        .eq('owner_user_id', userId);

      if (error) throw error;

      // If this was the active headshot, clear it
      const { data: settings } = await supabase
        .from('user_settings')
        .select('headshot_image_id')
        .eq('user_id', userId)
        .single();

      if (settings?.headshot_image_id === headshotId) {
        await updateUserSettings(userId, {
          headshot_image_id: null,
        } as any);
      }

      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete headshot');
      return false;
    } finally {
      setDeleting(false);
    }
  };

  const setAsActive = async (): Promise<boolean> => {
    if (!userId || !headshotId) return false;

    try {
      const { error } = await updateUserSettings(userId, {
        headshot_image_id: headshotId,
      } as any);

      if (error) throw error;

      Alert.alert('Success', 'Headshot set as active');
      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set headshot as active');
      return false;
    }
  };

  useEffect(() => {
    loadHeadshot();
  }, [headshotId, userId]);

  return {
    headshot,
    loading,
    duplicating,
    deleting,
    refresh,
    duplicate,
    deleteHeadshot,
    setAsActive,
  };
}

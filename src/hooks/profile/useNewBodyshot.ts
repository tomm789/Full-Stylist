/**
 * useNewBodyshot Hook
 * Form state and handlers for creating a new bodyshot
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useImageGeneration } from './useImageGeneration';
import { supabase } from '@/lib/supabase';

interface HeadshotOption {
  id: string;
  url: string;
}

interface UseNewBodyshotReturn {
  // Headshots
  headshots: HeadshotOption[];
  loadingHeadshots: boolean;
  selectedHeadshotId: string | null;
  setSelectedHeadshotId: (id: string | null) => void;
  loadHeadshots: () => Promise<void>;

  // Image generation (from useImageGeneration)
  generating: boolean;
  loadingMessage: string;
  uploadedUri: string | null;
  policyModalVisible: boolean;
  policyMessage: string;
  pickImage: (useCamera?: boolean) => Promise<void>;
  clearImage: () => void;
  closePolicyModal: () => void;

  // Actions
  handleGenerate: () => Promise<void>;
}

export function useNewBodyshot(): UseNewBodyshotReturn {
  const router = useRouter();
  const { user } = useAuth();
  const imageGeneration = useImageGeneration();

  const [headshots, setHeadshots] = useState<HeadshotOption[]>([]);
  const [selectedHeadshotId, setSelectedHeadshotId] = useState<string | null>(null);
  const [loadingHeadshots, setLoadingHeadshots] = useState(true);

  const loadHeadshots = useCallback(async () => {
    if (!user) return;

    setLoadingHeadshots(true);

    try {
      // Get all headshots
      const { data: images } = await supabase
        .from('images')
        .select('*')
        .eq('owner_user_id', user.id)
        .eq('source', 'ai_generated')
        .order('created_at', { ascending: false });

      if (images) {
        // Filter headshots by checking AI jobs
        const { data: jobs } = await supabase
          .from('ai_jobs')
          .select('*')
          .eq('owner_user_id', user.id)
          .eq('job_type', 'headshot_generate')
          .eq('status', 'succeeded');

        const headshotIds = new Set(
          jobs?.map((j) => j.result?.image_id || j.result?.generated_image_id).filter(Boolean) ||
            []
        );

        const headshotImages = images
          .filter((img) => headshotIds.has(img.id))
          .map((img) => {
            const { data: urlData } = supabase.storage
              .from(img.storage_bucket || 'media')
              .getPublicUrl(img.storage_key);
            return { id: img.id, url: urlData.publicUrl };
          });

        setHeadshots(headshotImages);
      }
    } catch (error) {
      console.error('Error loading headshots:', error);
    } finally {
      setLoadingHeadshots(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadHeadshots();
    }
  }, [user, loadHeadshots]);

  const handleGenerate = useCallback(async () => {
    if (!user || !selectedHeadshotId) return;

    const generatedImageId = await imageGeneration.generateBodyShot(
      user.id,
      selectedHeadshotId
    );
    if (generatedImageId) {
      router.replace(`/bodyshot/${generatedImageId}` as any);
    }
  }, [user, selectedHeadshotId, imageGeneration, router]);

  return {
    // Headshots
    headshots,
    loadingHeadshots,
    selectedHeadshotId,
    setSelectedHeadshotId,
    loadHeadshots,

    // Image generation
    generating: imageGeneration.generating,
    loadingMessage: imageGeneration.loadingMessage,
    uploadedUri: imageGeneration.uploadedUri,
    policyModalVisible: imageGeneration.policyModalVisible,
    policyMessage: imageGeneration.policyMessage,
    pickImage: imageGeneration.pickImage,
    clearImage: imageGeneration.clearImage,
    closePolicyModal: imageGeneration.closePolicyModal,

    // Actions
    handleGenerate,
  };
}

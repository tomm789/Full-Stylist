/**
 * useBodyShotGeneration
 * Manages headshot selection and body shot AI generation for the wardrobe screen.
 * Owns: currentHeadshotId/Url, currentBodyShotId, availableHeadshots,
 *       loadingHeadshots, isBodyShotGenerating, bodyShotJobId.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Headshot } from '@/lib/wardrobe/items-types';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { getUserGeneratedImages } from '@/lib/images';
import { triggerBodyShotGenerate } from '@/lib/ai-jobs/types';
import { triggerAIJobExecution } from '@/lib/ai-jobs/execution';
import { useAIJobPolling } from '@/hooks/ai';

export type UseBodyShotGenerationParams = {
  userId: string | null | undefined;
  outfitCreatorMode: boolean;
};

export function useBodyShotGeneration({ userId, outfitCreatorMode }: UseBodyShotGenerationParams) {
  const [currentHeadshotId, setCurrentHeadshotId] = useState<string | null>(null);
  const [currentHeadshotUrl, setCurrentHeadshotUrl] = useState<string | null>(null);
  const [currentBodyShotId, setCurrentBodyShotId] = useState<string | null>(null);
  const [availableHeadshots, setAvailableHeadshots] = useState<Headshot[]>([]);
  const [loadingHeadshots, setLoadingHeadshots] = useState(false);
  const [isBodyShotGenerating, setIsBodyShotGenerating] = useState(false);
  const [bodyShotJobId, setBodyShotJobId] = useState<string | null>(null);

  // Poll for body shot generation completion.
  useAIJobPolling({
    jobId: bodyShotJobId,
    enabled: Boolean(bodyShotJobId) && isBodyShotGenerating,
    interval: 3000,
    maxAttempts: 60,
    onComplete: useCallback(async (job: any) => {
      const result = job.result as any;
      const newBodyShotId =
        result?.image_id || result?.generated_image_id || result?.output_image_id;
      if (newBodyShotId && userId) {
        try {
          await updateUserSettings(userId, { body_shot_image_id: newBodyShotId });
          setCurrentBodyShotId(newBodyShotId);
        } catch (e) {
          console.error('[wardrobe] Failed to update body_shot_image_id after generation:', e);
        }
      }
      setIsBodyShotGenerating(false);
      setBodyShotJobId(null);
    }, [userId]),
  });

  // Fetch headshots and settings when outfit creator mode activates.
  useEffect(() => {
    if (!outfitCreatorMode || !userId) return;

    const fetchHeadshots = async () => {
      setLoadingHeadshots(true);
      try {
        const { data: userSettings } = await getUserSettings(userId);
        if (userSettings?.headshot_image_id) {
          setCurrentHeadshotId(userSettings.headshot_image_id);
          const { data: hsImg } = await supabase
            .from('images')
            .select('storage_key, storage_bucket')
            .eq('id', userSettings.headshot_image_id)
            .single();
          if (hsImg) {
            const url = supabase.storage
              .from(hsImg.storage_bucket || 'media')
              .getPublicUrl(hsImg.storage_key).data.publicUrl;
            setCurrentHeadshotUrl(url);
          }
        }
        if (userSettings?.body_shot_image_id) {
          setCurrentBodyShotId(userSettings.body_shot_image_id);
        }
        const { headshots: generatedHeadshots } = await getUserGeneratedImages(userId);
        setAvailableHeadshots(generatedHeadshots.map((h) => ({ id: h.id, url: h.url })));
      } catch (error) {
        console.error('Failed to fetch headshots:', error);
      } finally {
        setLoadingHeadshots(false);
      }
    };

    fetchHeadshots();
  }, [outfitCreatorMode, userId]);

  // Checks if the given headshot already has a body shot; activates it and returns the status.
  const handleCheckHeadshot = useCallback(
    async (headshotId: string): Promise<'activated' | 'needs_body_shot' | 'error'> => {
      if (!userId) return 'error';
      try {
        await updateUserSettings(userId, { headshot_image_id: headshotId });
        setCurrentHeadshotId(headshotId);
        const hs = availableHeadshots.find((h) => h.id === headshotId);
        if (hs?.url) setCurrentHeadshotUrl(hs.url);

        const { data: jobs } = await supabase
          .from('ai_jobs')
          .select('id, input, result')
          .eq('job_type', 'body_shot_generate')
          .eq('owner_user_id', userId)
          .eq('status', 'succeeded')
          .order('created_at', { ascending: false })
          .limit(50);

        if (jobs) {
          for (const job of jobs as any[]) {
            const input = job.input as any;
            if (input?.headshot_image_id === headshotId) {
              const result = job.result as any;
              const bodyShotId =
                result?.image_id || result?.generated_image_id || result?.output_image_id;
              if (bodyShotId) {
                const { data: imgCheck } = await supabase
                  .from('images')
                  .select('id')
                  .eq('id', bodyShotId)
                  .maybeSingle();
                if (imgCheck) {
                  await updateUserSettings(userId, { body_shot_image_id: bodyShotId });
                  setCurrentBodyShotId(bodyShotId);
                  return 'activated';
                }
              }
            }
          }
        }
        return 'needs_body_shot';
      } catch (error) {
        console.error('[wardrobe] handleCheckHeadshot error:', error);
        return 'error';
      }
    },
    [userId, availableHeadshots]
  );

  // Starts a new body shot generation with the provided mirror selfie.
  const handleGenerateBodyShot = useCallback(
    async (headshotId: string, mirrorSelfieImageId: string) => {
      if (!userId) return;
      try {
        const { data: job, error } = await triggerBodyShotGenerate(
          userId,
          mirrorSelfieImageId,
          headshotId
        );
        if (error || !job) {
          console.error('[wardrobe] Failed to create body_shot_generate job:', error);
          return;
        }
        const { error: triggerErr } = await triggerAIJobExecution(job.id);
        if (!triggerErr) {
          setIsBodyShotGenerating(true);
          setBodyShotJobId(job.id);
        }
      } catch (error) {
        console.error('[wardrobe] handleGenerateBodyShot error:', error);
      }
    },
    [userId]
  );

  // Reuses an existing body shot or triggers a new generation when the user skips the mirror selfie.
  const handleSkipBodyShot = useCallback(
    async (
      headshotId: string,
      onActivated: () => void,
      onGenerating: () => void
    ) => {
      if (!userId) return;
      if (!currentBodyShotId) {
        Alert.alert('No body shot', 'Please take a mirror selfie to continue.');
        return;
      }
      try {
        const { data: jobs } = await supabase
          .from('ai_jobs')
          .select('id, input, result')
          .eq('job_type', 'body_shot_generate')
          .eq('owner_user_id', userId)
          .eq('status', 'succeeded')
          .order('created_at', { ascending: false })
          .limit(50);

        if (jobs) {
          for (const job of jobs as any[]) {
            const input = job.input as any;
            if (
              input?.headshot_image_id === headshotId &&
              input?.body_photo_image_id === currentBodyShotId
            ) {
              const result = job.result as any;
              const bodyShotId =
                result?.image_id || result?.generated_image_id || result?.output_image_id;
              if (bodyShotId) {
                const { data: imgCheck } = await supabase
                  .from('images')
                  .select('id')
                  .eq('id', bodyShotId)
                  .maybeSingle();
                if (imgCheck) {
                  await updateUserSettings(userId, { body_shot_image_id: bodyShotId });
                  setCurrentBodyShotId(bodyShotId);
                  onActivated();
                  return;
                }
              }
            }
          }
        }

        // No reusable job — start generation with current body shot + new headshot.
        const { data: job, error } = await triggerBodyShotGenerate(
          userId,
          currentBodyShotId,
          headshotId
        );
        if (error || !job) {
          console.error('[wardrobe] handleSkipBodyShot failed to create job:', error);
          return;
        }
        const { error: triggerErr } = await triggerAIJobExecution(job.id);
        if (!triggerErr) {
          setIsBodyShotGenerating(true);
          setBodyShotJobId(job.id);
          onGenerating();
        }
      } catch (error) {
        console.error('[wardrobe] handleSkipBodyShot error:', error);
      }
    },
    [userId, currentBodyShotId]
  );

  return {
    currentHeadshotId,
    setCurrentHeadshotId,
    currentHeadshotUrl,
    currentBodyShotId,
    availableHeadshots,
    loadingHeadshots,
    isBodyShotGenerating,
    bodyShotJobId,
    handleCheckHeadshot,
    handleGenerateBodyShot,
    handleSkipBodyShot,
  };
}

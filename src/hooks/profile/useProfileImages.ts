/**
 * useProfileImages Hook
 * Manage profile images (headshots and body shots)
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { showErrorToast } from '@/utils/toast';
import { getPublicImageUrl, getUserGeneratedImages } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import { syncBodyshotAfterActiveHeadshotSet, waitForAIJobCompletion } from '@/lib/ai-jobs';

interface ProfileImage {
  id: string;
  url: string;
  created_at: string;
}

interface UseProfileImagesProps {
  userId: string | undefined;
}

interface UseProfileImagesReturn {
  loading: boolean;
  headshotImageUrl: string | null;
  bodyShotImageUrl: string | null;
  allHeadshots: ProfileImage[];
  allBodyShots: ProfileImage[];
  activeHeadshotId: string | null;
  activeBodyShotId: string | null;
  refreshImages: () => Promise<void>;
  setActiveHeadshot: (imageId: string) => Promise<void>;
  setActiveBodyShot: (imageId: string) => Promise<void>;
}

async function loadImageUrls(
  imageIds: string[]
): Promise<Map<string, string | null>> {
  const urls = new Map<string, string | null>();
  if (imageIds.length === 0) return urls;

  const { data: images } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', imageIds);

  images?.forEach((image) => {
    urls.set(image.id, getPublicImageUrl(image));
  });

  return urls;
}

async function fetchProfileImages(userId: string) {
  const { data: settings, error: settingsError } = await getUserSettings(userId);

  if (settingsError) {
    console.error('Settings load error:', settingsError);
    return null;
  }

  let headshotImageUrl: string | null = null;
  let bodyShotImageUrl: string | null = null;
  let activeHeadshotId: string | null = null;
  let activeBodyShotId: string | null = null;

  if (settings) {
    activeHeadshotId = settings.headshot_image_id || null;
    activeBodyShotId = settings.body_shot_image_id || null;

    const imageIds: string[] = [];
    if (activeHeadshotId) imageIds.push(activeHeadshotId);
    if (activeBodyShotId) imageIds.push(activeBodyShotId);

    if (imageIds.length > 0) {
      try {
        const imageUrls = await Promise.race([
          loadImageUrls(imageIds),
          new Promise<Map<string, string | null>>((resolve) =>
            setTimeout(() => resolve(new Map()), 5000)
          ),
        ]);
        if (activeHeadshotId) {
          headshotImageUrl = imageUrls.get(activeHeadshotId) || null;
        }
        if (activeBodyShotId) {
          bodyShotImageUrl = imageUrls.get(activeBodyShotId) || null;
        }
      } catch {
        if (__DEV__) console.warn('Active image load timeout');
      }
    }
  }

  let allHeadshots: ProfileImage[] = [];
  let allBodyShots: ProfileImage[] = [];
  try {
    const result = await Promise.race([
      getUserGeneratedImages(userId),
      new Promise<{ headshots: ProfileImage[]; bodyShots: ProfileImage[] }>((resolve) =>
        setTimeout(() => resolve({ headshots: [], bodyShots: [] }), 10000)
      ),
    ]);
    allHeadshots = result.headshots;
    allBodyShots = result.bodyShots;
  } catch {
    if (__DEV__) console.warn('Gallery load timeout');
  }

  return {
    headshotImageUrl,
    bodyShotImageUrl,
    allHeadshots,
    allBodyShots,
    activeHeadshotId,
    activeBodyShotId,
  };
}

export function useProfileImages({
  userId,
}: UseProfileImagesProps): UseProfileImagesReturn {
  const queryClient = useQueryClient();
  // Local overrides for optimistic updates from setActiveHeadshot/setActiveBodyShot
  const [localOverrides, setLocalOverrides] = useState<{
    activeHeadshotId?: string;
    headshotImageUrl?: string | null;
    activeBodyShotId?: string;
    bodyShotImageUrl?: string | null;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['profileImages', userId],
    queryFn: () => fetchProfileImages(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const refreshImages = useCallback(async () => {
    setLocalOverrides({});
    await queryClient.invalidateQueries({ queryKey: ['profileImages', userId] });
  }, [queryClient, userId]);

  const setActiveHeadshot = useCallback(async (imageId: string) => {
    if (!userId) return;

    try {
      const { error } = await updateUserSettings(userId, {
        headshot_image_id: imageId,
      });
      if (error) throw error;

      setLocalOverrides((prev) => ({ ...prev, activeHeadshotId: imageId }));
      const imageUrls = await loadImageUrls([imageId]);
      setLocalOverrides((prev) => ({
        ...prev,
        activeHeadshotId: imageId,
        headshotImageUrl: imageUrls.get(imageId) || null,
      }));

      // Run bodyshot sync in background
      void (async () => {
        try {
          const syncResult = await syncBodyshotAfterActiveHeadshotSet(userId, imageId);
          if (syncResult.status === 'reused_existing' && syncResult.imageId) {
            const bodyUrls = await loadImageUrls([syncResult.imageId]);
            setLocalOverrides((prev) => ({
              ...prev,
              activeBodyShotId: syncResult.imageId!,
              bodyShotImageUrl: bodyUrls.get(syncResult.imageId!) || null,
            }));
            return;
          }

          if (syncResult.status === 'error') {
            if (__DEV__) console.warn('[useProfileImages] Active headshot set but bodyshot sync failed', {
              userId, imageId, message: syncResult.message,
            });
            showErrorToast('Headshot is active, but we could not sync your body shot.');
            return;
          }

          if (syncResult.status === 'generation_started' && syncResult.jobId) {
            const { data: completedJob, error: pollError } = await waitForAIJobCompletion(
              syncResult.jobId, 60, 2000, '[BodyShotSync]'
            );
            if (pollError || !completedJob || completedJob.status === 'failed') {
              if (__DEV__) console.warn('[useProfileImages] Bodyshot generation failed', {
                userId, imageId, jobId: syncResult.jobId, pollError,
                status: completedJob?.status, error: completedJob?.error,
              });
              showErrorToast('Headshot is active, but generating a matching body shot failed.');
              return;
            }

            const generatedImageId =
              completedJob.result?.image_id || completedJob.result?.generated_image_id;
            if (generatedImageId) {
              const bodyUrls = await loadImageUrls([generatedImageId]);
              setLocalOverrides((prev) => ({
                ...prev,
                activeBodyShotId: generatedImageId,
                bodyShotImageUrl: bodyUrls.get(generatedImageId) || null,
              }));
            }
          }
        } catch (syncError: any) {
          if (__DEV__) console.warn('[useProfileImages] Unexpected bodyshot sync error', {
            userId, imageId, message: syncError?.message,
          });
          showErrorToast('Headshot is active, but we could not sync your body shot.');
        }
      })();
    } catch {
      showErrorToast('Failed to set active headshot');
    }
  }, [userId]);

  const setActiveBodyShot = useCallback(async (imageId: string) => {
    if (!userId) return;

    try {
      const { error } = await updateUserSettings(userId, {
        body_shot_image_id: imageId,
      });
      if (error) throw error;

      setLocalOverrides((prev) => ({ ...prev, activeBodyShotId: imageId }));
      const imageUrls = await loadImageUrls([imageId]);
      setLocalOverrides((prev) => ({
        ...prev,
        activeBodyShotId: imageId,
        bodyShotImageUrl: imageUrls.get(imageId) || null,
      }));
    } catch {
      showErrorToast('Failed to set active body shot');
    }
  }, [userId]);

  return {
    loading: isLoading,
    headshotImageUrl: localOverrides.headshotImageUrl !== undefined
      ? localOverrides.headshotImageUrl
      : data?.headshotImageUrl ?? null,
    bodyShotImageUrl: localOverrides.bodyShotImageUrl !== undefined
      ? localOverrides.bodyShotImageUrl
      : data?.bodyShotImageUrl ?? null,
    allHeadshots: data?.allHeadshots ?? [],
    allBodyShots: data?.allBodyShots ?? [],
    activeHeadshotId: localOverrides.activeHeadshotId ?? data?.activeHeadshotId ?? null,
    activeBodyShotId: localOverrides.activeBodyShotId ?? data?.activeBodyShotId ?? null,
    refreshImages,
    setActiveHeadshot,
    setActiveBodyShot,
  };
}

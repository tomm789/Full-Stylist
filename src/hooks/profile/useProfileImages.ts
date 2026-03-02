/**
 * useProfileImages Hook
 * Manage profile images (headshots and body shots)
 */

import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
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

export function useProfileImages({
  userId,
}: UseProfileImagesProps): UseProfileImagesReturn {
  const [loading, setLoading] = useState(true);
  const [headshotImageUrl, setHeadshotImageUrl] = useState<string | null>(null);
  const [bodyShotImageUrl, setBodyShotImageUrl] = useState<string | null>(null);
  const [allHeadshots, setAllHeadshots] = useState<ProfileImage[]>([]);
  const [allBodyShots, setAllBodyShots] = useState<ProfileImage[]>([]);
  const [activeHeadshotId, setActiveHeadshotId] = useState<string | null>(null);
  const [activeBodyShotId, setActiveBodyShotId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadImageUrls = async (
    imageIds: string[]
  ): Promise<Map<string, string | null>> => {
    const urls = new Map<string, string | null>();
    if (imageIds.length === 0) {
      return urls;
    }

    const { data: images } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key')
      .in('id', imageIds);

    images?.forEach((image) => {
      urls.set(image.id, getPublicImageUrl(image));
    });

    return urls;
  };

  const refreshImages = async () => {
    if (!userId) return;
    if (!mountedRef.current) return;

    setLoading(true);

    try {
      const { data: settings, error: settingsError } = await getUserSettings(
        userId
      );
      if (!mountedRef.current) return;

      if (settingsError) {
        console.error('Settings load error:', settingsError);
        return;
      }

      if (settings) {
        const imageIds: string[] = [];
        if (settings.headshot_image_id) {
          setActiveHeadshotId(settings.headshot_image_id);
          imageIds.push(settings.headshot_image_id);
        }
        if (settings.body_shot_image_id) {
          setActiveBodyShotId(settings.body_shot_image_id);
          imageIds.push(settings.body_shot_image_id);
        }

        if (imageIds.length > 0) {
          try {
            const imageUrls = await Promise.race([
              loadImageUrls(imageIds),
              new Promise<Map<string, string | null>>((resolve) =>
                setTimeout(() => resolve(new Map()), 5000)
              ),
            ]);
            if (!mountedRef.current) return;
            if (settings.headshot_image_id) {
              setHeadshotImageUrl(
                imageUrls.get(settings.headshot_image_id) || null
              );
            }
            if (settings.body_shot_image_id) {
              setBodyShotImageUrl(
                imageUrls.get(settings.body_shot_image_id) || null
              );
            }
          } catch (e) {
            console.warn('Active image load timeout');
          }
        }
      }

      try {
        await Promise.race([
          loadAllGeneratedImages(),
          new Promise((resolve) => setTimeout(resolve, 10000)),
        ]);
      } catch (e) {
        console.warn('Gallery load timeout');
      }
    } catch (error: any) {
      console.error('Load data error:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadAllGeneratedImages = async () => {
    if (!userId) return;

    try {
      const { headshots, bodyShots } = await getUserGeneratedImages(userId);
      if (!mountedRef.current) return;
      setAllHeadshots(headshots);
      setAllBodyShots(bodyShots);
    } catch (error: any) {
      console.error('Error loading generated images:', error);
    }
  };

  const setActiveHeadshot = async (imageId: string) => {
    if (!userId) return;

    try {
      const { error } = await updateUserSettings(userId, {
        headshot_image_id: imageId,
      });
      if (error) throw error;
      if (!mountedRef.current) return;

      setActiveHeadshotId(imageId);
      const imageUrls = await loadImageUrls([imageId]);
      if (!mountedRef.current) return;
      setHeadshotImageUrl(imageUrls.get(imageId) || null);

      // Run bodyshot sync in the background so headshot activation is immediate.
      void (async () => {
        try {
          const syncResult = await syncBodyshotAfterActiveHeadshotSet(userId, imageId);
          if (!mountedRef.current) return;
          if (syncResult.status === 'reused_existing' && syncResult.imageId) {
            setActiveBodyShotId(syncResult.imageId);
            const bodyUrls = await loadImageUrls([syncResult.imageId]);
            if (!mountedRef.current) return;
            setBodyShotImageUrl(bodyUrls.get(syncResult.imageId) || null);
            return;
          }

          if (syncResult.status === 'error') {
            console.warn('[useProfileImages] Active headshot set but bodyshot sync failed', {
              userId,
              imageId,
              message: syncResult.message,
            });
            if (!mountedRef.current) return;
            Alert.alert(
              'Body Shot Notice',
              'Headshot is active, but we could not sync your body shot.'
            );
            return;
          }

          if (syncResult.status === 'generation_started' && syncResult.jobId) {
            const { data: completedJob, error: pollError } = await waitForAIJobCompletion(
              syncResult.jobId,
              60,
              2000,
              '[BodyShotSync]'
            );
            if (!mountedRef.current) return;
            if (pollError || !completedJob || completedJob.status === 'failed') {
              console.warn('[useProfileImages] Bodyshot generation failed after headshot activation', {
                userId,
                imageId,
                jobId: syncResult.jobId,
                pollError,
                status: completedJob?.status,
                error: completedJob?.error,
              });
              if (!mountedRef.current) return;
              Alert.alert(
                'Body Shot Notice',
                'Headshot is active, but generating a matching body shot failed.'
              );
              return;
            }

            const generatedImageId =
              completedJob.result?.image_id || completedJob.result?.generated_image_id;
            if (generatedImageId) {
              setActiveBodyShotId(generatedImageId);
              const bodyUrls = await loadImageUrls([generatedImageId]);
              if (!mountedRef.current) return;
              setBodyShotImageUrl(bodyUrls.get(generatedImageId) || null);
            }
          }
        } catch (syncError: any) {
          console.warn('[useProfileImages] Unexpected bodyshot sync error', {
            userId,
            imageId,
            message: syncError?.message,
          });
          if (!mountedRef.current) return;
          Alert.alert(
            'Body Shot Notice',
            'Headshot is active, but we could not sync your body shot.'
          );
        }
      })();
    } catch (error: any) {
      if (mountedRef.current) {
        Alert.alert('Error', 'Failed to set active headshot');
      }
    }
  };

  const setActiveBodyShot = async (imageId: string) => {
    if (!userId) return;

    try {
      const { error } = await updateUserSettings(userId, {
        body_shot_image_id: imageId,
      });
      if (error) throw error;
      if (!mountedRef.current) return;

      setActiveBodyShotId(imageId);
      const imageUrls = await loadImageUrls([imageId]);
      if (!mountedRef.current) return;
      setBodyShotImageUrl(imageUrls.get(imageId) || null);
    } catch (error: any) {
      if (mountedRef.current) {
        Alert.alert('Error', 'Failed to set active body shot');
      }
    }
  };

  useEffect(() => {
    if (userId) {
      refreshImages();
    }
  }, [userId]);

  return {
    loading,
    headshotImageUrl,
    bodyShotImageUrl,
    allHeadshots,
    allBodyShots,
    activeHeadshotId,
    activeBodyShotId,
    refreshImages,
    setActiveHeadshot,
    setActiveBodyShot,
  };
}

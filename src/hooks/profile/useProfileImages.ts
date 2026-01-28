/**
 * useProfileImages Hook
 * Manage profile images (headshots and body shots)
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { getPublicImageUrl, getUserGeneratedImages } from '@/lib/images';
import { supabase } from '@/lib/supabase';

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

    setLoading(true);

    try {
      const { data: settings, error: settingsError } = await getUserSettings(
        userId
      );

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
      setLoading(false);
    }
  };

  const loadAllGeneratedImages = async () => {
    if (!userId) return;

    try {
      const { headshots, bodyShots } = await getUserGeneratedImages(userId);
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

      setActiveHeadshotId(imageId);
      const imageUrls = await loadImageUrls([imageId]);
      setHeadshotImageUrl(imageUrls.get(imageId) || null);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to set active headshot');
    }
  };

  const setActiveBodyShot = async (imageId: string) => {
    if (!userId) return;

    try {
      const { error } = await updateUserSettings(userId, {
        body_shot_image_id: imageId,
      });
      if (error) throw error;

      setActiveBodyShotId(imageId);
      const imageUrls = await loadImageUrls([imageId]);
      setBodyShotImageUrl(imageUrls.get(imageId) || null);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to set active body shot');
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

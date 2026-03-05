/**
 * useProfileData Hook (OPTIMIZED)
 * Load user profile, settings, posts, and images
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFullUserProfile, updateUserProfile } from '@/lib/user';
import { getUserSettings } from '@/lib/settings';
import { getFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { getOutfitCoverImages } from '@/lib/images';

interface UseProfileDataProps {
  userId: string | undefined;
}

interface UseProfileDataReturn {
  profile: any | null;
  settings: any | null;
  posts: FeedItem[];
  postImages: Map<string, string | null>;
  headshotImages: Array<{ id: string; url: string; created_at: string }>;
  bodyShotImages: Array<{ id: string; url: string; created_at: string }>;
  loading: boolean;
  refresh: () => Promise<void>;
}

// Batch generate public URLs (no async needed)
function batchGenerateImageUrls(
  images: Array<{ id: string; storage_bucket?: string | null; storage_key?: string | null; created_at: string }>
): Array<{ id: string; url: string; created_at: string }> {
  return images
    .filter(img => img.storage_key)
    .map(img => {
      const { data } = supabase.storage
        .from(img.storage_bucket || 'media')
        .getPublicUrl(img.storage_key!);
      return {
        id: img.id,
        url: data.publicUrl,
        created_at: img.created_at,
      };
    });
}

interface ProfileQueryData {
  profile: any | null;
  settings: any | null;
  posts: FeedItem[];
  postImages: Map<string, string | null>;
  headshotImages: Array<{ id: string; url: string; created_at: string }>;
  bodyShotImages: Array<{ id: string; url: string; created_at: string }>;
}

export function useProfileData({
  userId,
}: UseProfileDataProps): UseProfileDataReturn {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['profileData', userId] as const, [userId]);

  const { data, isLoading } = useQuery<ProfileQueryData>({
    queryKey,
    queryFn: async () => {
      const [
        { data: profileData },
        { data: settingsData },
        { data: feedData },
        { data: allImages },
      ] = await Promise.all([
        getFullUserProfile(userId!),
        getUserSettings(userId!),
        getFeed(userId!, 50, 0),
        supabase
          .from('images')
          .select('id, storage_bucket, storage_key, created_at')
          .eq('owner_user_id', userId!)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      let localProfile = profileData || null;
      const localSettings = settingsData;
      let localPosts: FeedItem[] = [];
      let localPostImages = new Map<string, string | null>();
      let localHeadshots: Array<{ id: string; url: string; created_at: string }> = [];
      let localBodyShots: Array<{ id: string; url: string; created_at: string }> = [];

      if (feedData) {
        localPosts = feedData.filter((item) => {
          const post = item.type === 'post' ? item.post : item.repost?.original_post;
          return post?.owner_user_id === userId;
        });

        const outfits = localPosts
          .map(item => item.entity?.outfit)
          .filter(Boolean);

        try {
          localPostImages = await getOutfitCoverImages(outfits, 'card');
        } catch (imgErr) {
          console.error('Failed to load post images:', imgErr);
        }
      }

      if (allImages) {
        localHeadshots = batchGenerateImageUrls(
          allImages.filter((img) =>
            (img.storage_key || '').toLowerCase().includes('headshot')
          )
        );

        localBodyShots = batchGenerateImageUrls(
          allImages.filter((img) => {
            const key = (img.storage_key || '').toLowerCase();
            return key.includes('body_shot') || key.includes('bodyshot');
          })
        );

        // Avatar backfill — fire-and-forget write, don't block rendering
        if (profileData && !profileData.avatar_url && localHeadshots.length > 0 && userId) {
          const earliestHeadshot = [...localHeadshots].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          if (earliestHeadshot?.url) {
            localProfile = { ...profileData, avatar_url: earliestHeadshot.url };
            updateUserProfile(userId, { avatar_url: earliestHeadshot.url }).catch(() => {});
          }
        }
      }

      return {
        profile: localProfile,
        settings: localSettings,
        posts: localPosts,
        postImages: localPostImages,
        headshotImages: localHeadshots,
        bodyShotImages: localBodyShots,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    profile: data?.profile ?? null,
    settings: data?.settings ?? null,
    posts: data?.posts ?? [],
    postImages: data?.postImages ?? new Map(),
    headshotImages: data?.headshotImages ?? [],
    bodyShotImages: data?.bodyShotImages ?? [],
    loading: isLoading,
    refresh,
  };
}

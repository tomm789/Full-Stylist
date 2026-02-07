/**
 * useProfileData Hook (OPTIMIZED)
 * Load user profile, settings, posts, and images
 */

import { useState, useEffect } from 'react';
import { getFullUserProfile, updateUserProfile } from '@/lib/user';
import { getUserSettings } from '@/lib/settings';
import { getFeed, FeedItem } from '@/lib/posts';
import { supabase } from '@/lib/supabase';

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

// 🔥 OPTIMIZATION: Batch generate public URLs (no async needed!)
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

// 🔥 OPTIMIZATION: Get outfit cover images in batch
async function batchGetOutfitCoverImages(
  outfits: Array<{ id: string; cover_image_id?: string }>
): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();
  
  // Get all cover image IDs
  const coverImageIds = outfits
    .map(o => o.cover_image_id)
    .filter(Boolean) as string[];

  if (coverImageIds.length === 0) {
    outfits.forEach(o => imageMap.set(o.id, null));
    return imageMap;
  }

  // 🔥 Single query to get all cover images
  const { data: coverImages } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', coverImageIds);

  // Create lookup map
  const coverImageLookup = new Map(
    (coverImages || []).map(img => [img.id, img])
  );

  // Generate URLs for all outfits
  outfits.forEach(outfit => {
    if (outfit.cover_image_id) {
      const img = coverImageLookup.get(outfit.cover_image_id);
      if (img?.storage_key) {
        const { data } = supabase.storage
          .from(img.storage_bucket || 'media')
          .getPublicUrl(img.storage_key);
        imageMap.set(outfit.id, data.publicUrl);
        return;
      }
    }
    imageMap.set(outfit.id, null);
  });

  return imageMap;
}

export function useProfileData({
  userId,
}: UseProfileDataProps): UseProfileDataReturn {
  const [profile, setProfile] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [postImages, setPostImages] = useState<Map<string, string | null>>(new Map());
  const [headshotImages, setHeadshotImages] = useState<Array<{ id: string; url: string; created_at: string }>>([]);
  const [bodyShotImages, setBodyShotImages] = useState<Array<{ id: string; url: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 🔥 OPTIMIZATION: Load profile, settings, posts, and images in parallel
      const [
        { data: profileData },
        { data: settingsData },
        { data: feedData },
        { data: allImages },
      ] = await Promise.all([
        getFullUserProfile(userId),
        getUserSettings(userId),
        getFeed(userId, 50, 0),
        supabase
          .from('images')
          .select('id, storage_bucket, storage_key, created_at')
          .eq('owner_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (profileData) {
        setProfile(profileData);
      }

      setSettings(settingsData);

      // Filter to user's own posts
      if (feedData) {
        const userPosts = feedData.filter((item) => {
          const post = item.type === 'post' ? item.post : item.repost?.original_post;
          return post?.owner_user_id === userId;
        });

        setPosts(userPosts);

        // 🔥 OPTIMIZATION: Batch get outfit cover images
        const outfits = userPosts
          .map(item => item.entity?.outfit)
          .filter(Boolean);
        
        const imageCache = await batchGetOutfitCoverImages(outfits);
        setPostImages(imageCache);
      }

      // 🔥 OPTIMIZATION: Batch generate URLs for profile images (no async!)
      if (allImages) {
        const headshots = batchGenerateImageUrls(
          allImages.filter((img) =>
            (img.storage_key || '').toLowerCase().includes('headshot')
          )
        );
        
        const bodyShots = batchGenerateImageUrls(
          allImages.filter((img) => {
            const key = (img.storage_key || '').toLowerCase();
            return key.includes('body_shot') || key.includes('bodyshot');
          })
        );

        setHeadshotImages(headshots);
        setBodyShotImages(bodyShots);

        if (profileData && !profileData.avatar_url && headshots.length > 0 && userId) {
          const earliestHeadshot = [...headshots].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          if (earliestHeadshot?.url) {
            await updateUserProfile(userId, { avatar_url: earliestHeadshot.url });
            setProfile({ ...profileData, avatar_url: earliestHeadshot.url });
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  return {
    profile,
    settings,
    posts,
    postImages,
    headshotImages,
    bodyShotImages,
    loading,
    refresh,
  };
}

/**
 * useProfileData Hook
 * Load user profile, settings, posts, and images
 */

import { useState, useEffect } from 'react';
import { getFullUserProfile } from '@/lib/user';
import { getUserSettings } from '@/lib/settings';
import { getFeed, FeedItem } from '@/lib/posts';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { getUserGeneratedImages } from '@/lib/images';

interface UseProfileDataProps {
  userId: string | undefined;
}

interface UseProfileDataReturn {
  profile: any | null;
  settings: any | null;
  posts: FeedItem[];
  postImages: Map<string, string | null>;
  headshotImages: Array<{ id: string; url: string }>;
  bodyShotImages: Array<{ id: string; url: string }>;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useProfileData({
  userId,
}: UseProfileDataProps): UseProfileDataReturn {
  const [profile, setProfile] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [postImages, setPostImages] = useState<Map<string, string | null>>(new Map());
  const [headshotImages, setHeadshotImages] = useState<Array<{ id: string; url: string }>>([]);
  const [bodyShotImages, setBodyShotImages] = useState<Array<{ id: string; url: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load profile, settings, and posts in parallel
      const [
        { data: profileData },
        { data: settingsData },
        { data: feedData },
      ] = await Promise.all([
        getFullUserProfile(userId),
        getUserSettings(userId),
        getFeed(userId, 50, 0),
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

        // Cache outfit images
        const imageCache = new Map<string, string | null>();
        await Promise.all(
          userPosts.map(async (item) => {
            if (item.entity?.outfit) {
              const url = await getOutfitCoverImageUrl(item.entity.outfit);
              imageCache.set(item.entity.outfit.id, url);
            }
          })
        );
        setPostImages(imageCache);
      }

      // Load profile images
      const { headshots, bodyShots } = await getUserGeneratedImages(userId);
      setHeadshotImages(headshots);
      setBodyShotImages(bodyShots);
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

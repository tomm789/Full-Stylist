/**
 * useUserProfile Hook (OPTIMIZED)
 * Load and manage user profile data
 */

import { useState, useEffect } from 'react';
import { getFullUserProfile } from '@/lib/user';
import { getUserOutfits } from '@/lib/outfits';
import { getUserLookbooks } from '@/lib/lookbooks';
import { supabase } from '@/lib/supabase';

interface UseUserProfileProps {
  userId: string | undefined;
  currentUserId: string | undefined;
}

interface UseUserProfileReturn {
  profile: any | null;
  outfits: any[];
  lookbooks: any[];
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, string | null>;
  outfitWearCounts: Map<string, number>;
  loading: boolean;
  refreshingContent: boolean;
  refresh: () => Promise<void>;
  /** Refresh only tab content (outfits/lookbooks/wardrobe) without full page reload */
  refreshContent: () => Promise<void>;
  isOwnProfile: boolean;
}

// 🔥 OPTIMIZATION: Batch get outfit cover images
async function batchGetOutfitCoverImages(
  outfits: Array<{ id: string; cover_image_id?: string }>
): Promise<Map<string, string | null>> {
  const imageMap = new Map<string, string | null>();
  
  const coverImageIds = outfits
    .map(o => o.cover_image_id)
    .filter(Boolean) as string[];

  if (coverImageIds.length === 0) {
    outfits.forEach(o => imageMap.set(o.id, null));
    return imageMap;
  }

  const { data: coverImages } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', coverImageIds);

  const coverImageLookup = new Map(
    (coverImages || []).map(img => [img.id, img])
  );

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

export function useUserProfile({
  userId,
  currentUserId,
}: UseUserProfileProps): UseUserProfileReturn {
  const [profile, setProfile] = useState<any | null>(null);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [lookbooks, setLookbooks] = useState<any[]>([]);
  const [outfitImages, setOutfitImages] = useState<Map<string, string | null>>(new Map());
  const [lookbookImages, setLookbookImages] = useState<Map<string, string | null>>(new Map());
  const [outfitWearCounts, setOutfitWearCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshingContent, setRefreshingContent] = useState(false);

  const isOwnProfile = currentUserId === userId;

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load profile and content in parallel
      const [
        { data: profileData },
        { data: outfitsData },
        { data: lookbooksData },
      ] = await Promise.all([
        getFullUserProfile(userId),
        getUserOutfits(userId),
        getUserLookbooks(userId),
      ]);

      setProfile(profileData);
      setOutfits(outfitsData || []);
      setLookbooks(lookbooksData || []);

      // 🔥 OPTIMIZATION: Batch load wear counts and lookbook data
      const outfitIds = (outfitsData || []).map(outfit => outfit.id);

      const [wearCountsData, lookbookOutfitsData] = await Promise.all([
        // Get wear counts in ONE query
        outfitIds.length > 0
          ? supabase
              .from('calendar_entries')
              .select('outfit_id, calendar_day:calendar_day_id(owner_user_id)')
              .in('outfit_id', outfitIds)
              .eq('status', 'worn')
          : Promise.resolve({ data: null }),
        
        // Get first outfit for each lookbook in ONE query
        lookbooksData && lookbooksData.length > 0
          ? supabase
              .from('lookbook_outfits')
              .select('lookbook_id, outfit_id, position')
              .in('lookbook_id', lookbooksData.map(lb => lb.id))
              .order('position', { ascending: true })
          : Promise.resolve({ data: null }),
      ]);

      // Process wear counts
      if (outfitIds.length > 0) {
        const wearCounts = new Map<string, number>();
        outfitIds.forEach(id => wearCounts.set(id, 0));

        (wearCountsData.data || []).forEach((entry: any) => {
          const ownerId = entry.calendar_day?.owner_user_id;
          if (!entry.outfit_id || !ownerId || ownerId === userId) return;
          wearCounts.set(entry.outfit_id, (wearCounts.get(entry.outfit_id) || 0) + 1);
        });

        setOutfitWearCounts(wearCounts);
      }

      // 🔥 OPTIMIZATION: Batch get outfit images
      if (outfitsData && outfitsData.length > 0) {
        const outfitImageCache = await batchGetOutfitCoverImages(outfitsData);
        setOutfitImages(outfitImageCache);
      }

      // 🔥 OPTIMIZATION: Process lookbook images
      if (lookbooksData && lookbooksData.length > 0 && outfitsData) {
        const lookbookImageCache = new Map<string, string | null>();
        
        // Group lookbook outfits by lookbook_id (get first one only)
        const firstOutfitsByLookbook = new Map<string, string>();
        (lookbookOutfitsData.data || []).forEach((lo: any) => {
          if (!firstOutfitsByLookbook.has(lo.lookbook_id)) {
            firstOutfitsByLookbook.set(lo.lookbook_id, lo.outfit_id);
          }
        });

        // Get images for first outfits
        const firstOutfits = Array.from(firstOutfitsByLookbook.values())
          .map(outfitId => outfitsData.find(o => o.id === outfitId))
          .filter(Boolean);

        const firstOutfitImages = await batchGetOutfitCoverImages(firstOutfits);

        // Map back to lookbooks
        lookbooksData.forEach(lookbook => {
          const firstOutfitId = firstOutfitsByLookbook.get(lookbook.id);
          if (firstOutfitId) {
            lookbookImageCache.set(lookbook.id, firstOutfitImages.get(firstOutfitId) || null);
          } else {
            lookbookImageCache.set(lookbook.id, null);
          }
        });

        setLookbookImages(lookbookImageCache);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  /** Refresh only outfits/lookbooks/images without triggering full loading state */
  const refreshContent = async () => {
    if (!userId) return;

    setRefreshingContent(true);
    try {
      const [
        { data: outfitsData },
        { data: lookbooksData },
      ] = await Promise.all([
        getUserOutfits(userId),
        getUserLookbooks(userId),
      ]);

      setOutfits(outfitsData || []);
      setLookbooks(lookbooksData || []);

      const outfitIds = (outfitsData || []).map(outfit => outfit.id);

      const [wearCountsData, lookbookOutfitsData] = await Promise.all([
        outfitIds.length > 0
          ? supabase
              .from('calendar_entries')
              .select('outfit_id, calendar_day:calendar_day_id(owner_user_id)')
              .in('outfit_id', outfitIds)
              .eq('status', 'worn')
          : Promise.resolve({ data: null }),
        lookbooksData && lookbooksData.length > 0
          ? supabase
              .from('lookbook_outfits')
              .select('lookbook_id, outfit_id, position')
              .in('lookbook_id', lookbooksData.map(lb => lb.id))
              .order('position', { ascending: true })
          : Promise.resolve({ data: null }),
      ]);

      if (outfitIds.length > 0) {
        const wearCounts = new Map<string, number>();
        outfitIds.forEach(id => wearCounts.set(id, 0));
        (wearCountsData.data || []).forEach((entry: any) => {
          const ownerId = entry.calendar_day?.owner_user_id;
          if (!entry.outfit_id || !ownerId || ownerId === userId) return;
          wearCounts.set(entry.outfit_id, (wearCounts.get(entry.outfit_id) || 0) + 1);
        });
        setOutfitWearCounts(wearCounts);
      }

      if (outfitsData && outfitsData.length > 0) {
        const outfitImageCache = await batchGetOutfitCoverImages(outfitsData);
        setOutfitImages(outfitImageCache);
      }

      if (lookbooksData && lookbooksData.length > 0 && outfitsData) {
        const lookbookImageCache = new Map<string, string | null>();
        const firstOutfitsByLookbook = new Map<string, string>();
        (lookbookOutfitsData.data || []).forEach((lo: any) => {
          if (!firstOutfitsByLookbook.has(lo.lookbook_id)) {
            firstOutfitsByLookbook.set(lo.lookbook_id, lo.outfit_id);
          }
        });
        const firstOutfits = Array.from(firstOutfitsByLookbook.values())
          .map(outfitId => outfitsData.find(o => o.id === outfitId))
          .filter(Boolean);
        const firstOutfitImages = await batchGetOutfitCoverImages(firstOutfits);
        lookbooksData.forEach(lookbook => {
          const firstOutfitId = firstOutfitsByLookbook.get(lookbook.id);
          if (firstOutfitId) {
            lookbookImageCache.set(lookbook.id, firstOutfitImages.get(firstOutfitId) || null);
          } else {
            lookbookImageCache.set(lookbook.id, null);
          }
        });
        setLookbookImages(lookbookImageCache);
      }
    } catch (error) {
      console.error('Error refreshing content:', error);
    } finally {
      setRefreshingContent(false);
    }
  };

  const refresh = async () => {
    await loadProfile();
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  return {
    profile,
    outfits,
    lookbooks,
    outfitImages,
    lookbookImages,
    outfitWearCounts,
    loading,
    refreshingContent,
    refresh,
    refreshContent,
    isOwnProfile,
  };
}
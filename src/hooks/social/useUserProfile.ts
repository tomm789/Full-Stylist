/**
 * useUserProfile Hook (OPTIMIZED)
 * Load and manage user profile data
 */

import { useState, useEffect } from 'react';
import { getFullUserProfile } from '@/lib/user';
import { getUserOutfits } from '@/lib/outfits';
import { getUserLookbooks } from '@/lib/lookbooks';
import { supabase } from '@/lib/supabase';
import { batchGetOutfitCoverImages } from '@/utils/batchImageHelpers';

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

      // Collect all data into locals before setting any state
      // so React 18 batches all updates into a single render
      const localOutfits = outfitsData || [];
      const localLookbooks = lookbooksData || [];
      const outfitIds = localOutfits.map(outfit => outfit.id);

      const [wearCountsData, lookbookOutfitsData] = await Promise.all([
        outfitIds.length > 0
          ? supabase
              .from('calendar_entries')
              .select('outfit_id, calendar_day:calendar_day_id(owner_user_id)')
              .in('outfit_id', outfitIds)
              .eq('status', 'worn')
          : Promise.resolve({ data: null }),
        localLookbooks.length > 0
          ? supabase
              .from('lookbook_outfits')
              .select('lookbook_id, outfit_id, position')
              .in('lookbook_id', localLookbooks.map(lb => lb.id))
              .order('position', { ascending: true })
          : Promise.resolve({ data: null }),
      ]);

      // Process wear counts
      const localWearCounts = new Map<string, number>();
      if (outfitIds.length > 0) {
        outfitIds.forEach(id => localWearCounts.set(id, 0));
        (wearCountsData.data || []).forEach((entry: any) => {
          const ownerId = entry.calendar_day?.owner_user_id;
          if (!entry.outfit_id || !ownerId || ownerId === userId) return;
          localWearCounts.set(entry.outfit_id, (localWearCounts.get(entry.outfit_id) || 0) + 1);
        });
      }

      // Batch get outfit images
      let localOutfitImages = new Map<string, string | null>();
      if (localOutfits.length > 0) {
        try {
          localOutfitImages = await batchGetOutfitCoverImages(localOutfits, 'card');
        } catch (imgErr) {
          console.error('Failed to load outfit images:', imgErr);
        }
      }

      // Process lookbook images
      let localLookbookImages = new Map<string, string | null>();
      if (localLookbooks.length > 0 && outfitsData) {
        const firstOutfitsByLookbook = new Map<string, string>();
        (lookbookOutfitsData.data || []).forEach((lo: any) => {
          if (!firstOutfitsByLookbook.has(lo.lookbook_id)) {
            firstOutfitsByLookbook.set(lo.lookbook_id, lo.outfit_id);
          }
        });

        const firstOutfits = Array.from(firstOutfitsByLookbook.values())
          .map(outfitId => outfitsData.find(o => o.id === outfitId))
          .filter(Boolean);

        try {
          const firstOutfitImages = await batchGetOutfitCoverImages(firstOutfits, 'card');
          localLookbooks.forEach(lookbook => {
            const firstOutfitId = firstOutfitsByLookbook.get(lookbook.id);
            if (firstOutfitId) {
              localLookbookImages.set(lookbook.id, firstOutfitImages.get(firstOutfitId) || null);
            } else {
              localLookbookImages.set(lookbook.id, null);
            }
          });
        } catch (imgErr) {
          console.error('Failed to load lookbook images:', imgErr);
        }
      }

      // Set ALL state in one synchronous tick — React batches into one render
      setProfile(profileData);
      setOutfits(localOutfits);
      setLookbooks(localLookbooks);
      setOutfitWearCounts(localWearCounts);
      setOutfitImages(localOutfitImages);
      setLookbookImages(localLookbookImages);
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

      // Collect all data into locals before setting any state
      const localOutfits = outfitsData || [];
      const localLookbooks = lookbooksData || [];
      const outfitIds = localOutfits.map(outfit => outfit.id);

      const [wearCountsData, lookbookOutfitsData] = await Promise.all([
        outfitIds.length > 0
          ? supabase
              .from('calendar_entries')
              .select('outfit_id, calendar_day:calendar_day_id(owner_user_id)')
              .in('outfit_id', outfitIds)
              .eq('status', 'worn')
          : Promise.resolve({ data: null }),
        localLookbooks.length > 0
          ? supabase
              .from('lookbook_outfits')
              .select('lookbook_id, outfit_id, position')
              .in('lookbook_id', localLookbooks.map(lb => lb.id))
              .order('position', { ascending: true })
          : Promise.resolve({ data: null }),
      ]);

      const localWearCounts = new Map<string, number>();
      if (outfitIds.length > 0) {
        outfitIds.forEach(id => localWearCounts.set(id, 0));
        (wearCountsData.data || []).forEach((entry: any) => {
          const ownerId = entry.calendar_day?.owner_user_id;
          if (!entry.outfit_id || !ownerId || ownerId === userId) return;
          localWearCounts.set(entry.outfit_id, (localWearCounts.get(entry.outfit_id) || 0) + 1);
        });
      }

      let localOutfitImages = new Map<string, string | null>();
      if (localOutfits.length > 0) {
        try {
          localOutfitImages = await batchGetOutfitCoverImages(localOutfits, 'card');
        } catch (imgErr) {
          console.error('Failed to load outfit images:', imgErr);
        }
      }

      let localLookbookImages = new Map<string, string | null>();
      if (localLookbooks.length > 0 && outfitsData) {
        const firstOutfitsByLookbook = new Map<string, string>();
        (lookbookOutfitsData.data || []).forEach((lo: any) => {
          if (!firstOutfitsByLookbook.has(lo.lookbook_id)) {
            firstOutfitsByLookbook.set(lo.lookbook_id, lo.outfit_id);
          }
        });
        const firstOutfits = Array.from(firstOutfitsByLookbook.values())
          .map(outfitId => outfitsData.find(o => o.id === outfitId))
          .filter(Boolean);
        try {
          const firstOutfitImages = await batchGetOutfitCoverImages(firstOutfits, 'card');
          localLookbooks.forEach(lookbook => {
            const firstOutfitId = firstOutfitsByLookbook.get(lookbook.id);
            if (firstOutfitId) {
              localLookbookImages.set(lookbook.id, firstOutfitImages.get(firstOutfitId) || null);
            } else {
              localLookbookImages.set(lookbook.id, null);
            }
          });
        } catch (imgErr) {
          console.error('Failed to load lookbook images:', imgErr);
        }
      }

      // Set ALL state in one synchronous tick — React batches into one render
      setOutfits(localOutfits);
      setLookbooks(localLookbooks);
      setOutfitWearCounts(localWearCounts);
      setOutfitImages(localOutfitImages);
      setLookbookImages(localLookbookImages);
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

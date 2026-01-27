/**
 * useUserProfile Hook
 * Load and manage user profile data
 */

import { useState, useEffect } from 'react';
import { getFullUserProfile } from '@/lib/user';
import { getUserOutfits } from '@/lib/outfits';
import { getUserLookbooks } from '@/lib/lookbooks';
import { getOutfitCoverImageUrl } from '@/lib/images';
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
  refresh: () => Promise<void>;
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
  const [lookbookImages, setLookbookImages] = useState<Map<string, string | null>>(
    new Map()
  );
  const [outfitWearCounts, setOutfitWearCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUserId === userId;

  const loadProfile = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load profile
      const { data: profileData } = await getFullUserProfile(userId);
      setProfile(profileData);

      // Load content
      const [{ data: outfitsData }, { data: lookbooksData }] = await Promise.all([
        getUserOutfits(userId),
        getUserLookbooks(userId),
      ]);

      setOutfits(outfitsData || []);
      setLookbooks(lookbooksData || []);

      // Load outfit wear counts
      if (outfitsData && outfitsData.length > 0) {
        const outfitIds = outfitsData.map((outfit) => outfit.id);
        const wearCounts = new Map<string, number>();
        outfitIds.forEach((id) => wearCounts.set(id, 0));

        const { data: wornEntries } = await supabase
          .from('calendar_entries')
          .select('outfit_id, calendar_day:calendar_day_id(owner_user_id)')
          .in('outfit_id', outfitIds)
          .eq('status', 'worn');

        wornEntries?.forEach((entry: any) => {
          const ownerId = entry.calendar_day?.owner_user_id;
          if (!entry.outfit_id || !ownerId || ownerId === userId) return;
          wearCounts.set(entry.outfit_id, (wearCounts.get(entry.outfit_id) || 0) + 1);
        });

        setOutfitWearCounts(wearCounts);
      }

      // Load outfit images
      const outfitImageCache = new Map<string, string | null>();
      await Promise.all(
        (outfitsData || []).map(async (outfit) => {
          const url = await getOutfitCoverImageUrl(outfit);
          outfitImageCache.set(outfit.id, url);
        })
      );
      setOutfitImages(outfitImageCache);

      // Load lookbook images (first outfit as thumbnail)
      const lookbookImageCache = new Map<string, string | null>();
      if (lookbooksData && outfitsData) {
        await Promise.all(
          lookbooksData.map(async (lookbook) => {
            // Get first outfit from lookbook
            const { data: lookbookData } = await supabase
              .from('lookbooks')
              .select('id')
              .eq('id', lookbook.id)
              .single();

            const { data: lookbookOutfits } = await supabase
              .from('lookbook_outfits')
              .select('outfit_id')
              .eq('lookbook_id', lookbook.id)
              .order('position', { ascending: true })
              .limit(1);

            if (lookbookOutfits && lookbookOutfits.length > 0) {
              const firstOutfitId = lookbookOutfits[0].outfit_id;
              const firstOutfit = outfitsData.find((o) => o.id === firstOutfitId);
              if (firstOutfit) {
                const url = await getOutfitCoverImageUrl(firstOutfit);
                lookbookImageCache.set(lookbook.id, url);
                return;
              }
            }
            lookbookImageCache.set(lookbook.id, null);
          })
        );
      }
      setLookbookImages(lookbookImageCache);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
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
    refresh,
    isOwnProfile,
  };
}

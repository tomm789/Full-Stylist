/**
 * useUserProfile Hook (OPTIMIZED)
 * Load and manage user profile data.
 * Split into two queries: core data (profile/outfits/lookbooks) renders immediately,
 * images load in a dependent second query without blocking the UI.
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFullUserProfile } from '@/lib/user';
import { getUserOutfits } from '@/lib/outfits';
import { getUserLookbooks } from '@/lib/lookbooks';
import { supabase } from '@/lib/supabase';
import { getOutfitCoverImages } from '@/lib/images';

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

// ── Primary query: profile + outfits + lookbooks + wear counts ───────────────

async function fetchUserProfileCore(userId: string) {
  const [{ data: profileData }, { data: outfitsData }, { data: lookbooksData }] =
    await Promise.all([
      getFullUserProfile(userId),
      getUserOutfits(userId),
      getUserLookbooks(userId),
    ]);

  const localOutfits = outfitsData || [];
  const localLookbooks = lookbooksData || [];
  const outfitIds = localOutfits.map((o) => o.id);

  // Wear counts (cheap query, keep in primary)
  const localWearCounts = new Map<string, number>();
  if (outfitIds.length > 0) {
    const { data: wearCountsData } = await supabase
      .from('calendar_entries')
      .select('outfit_id, calendar_day:calendar_day_id(owner_user_id)')
      .in('outfit_id', outfitIds)
      .eq('status', 'worn');

    outfitIds.forEach((id) => localWearCounts.set(id, 0));
    (wearCountsData || []).forEach((entry: any) => {
      const ownerId = entry.calendar_day?.owner_user_id;
      if (!entry.outfit_id || !ownerId || ownerId === userId) return;
      localWearCounts.set(entry.outfit_id, (localWearCounts.get(entry.outfit_id) || 0) + 1);
    });
  }

  return {
    profile: profileData,
    outfits: localOutfits,
    lookbooks: localLookbooks,
    outfitWearCounts: localWearCounts,
  };
}

// ── Dependent query: outfit + lookbook images ────────────────────────────────

async function fetchUserProfileImages(
  outfits: any[],
  lookbooks: any[]
): Promise<{
  outfitImages: Map<string, string | null>;
  lookbookImages: Map<string, string | null>;
}> {
  let outfitImages = new Map<string, string | null>();
  let lookbookImages = new Map<string, string | null>();

  // Fetch outfit cover images + lookbook images in parallel
  const [outfitResult, lookbookResult] = await Promise.all([
    outfits.length > 0
      ? getOutfitCoverImages(outfits, 'card').catch((err) => {
          console.error('Failed to load outfit images:', err);
          return new Map<string, string | null>();
        })
      : Promise.resolve(new Map<string, string | null>()),
    fetchLookbookImages(lookbooks, outfits),
  ]);

  outfitImages = outfitResult;
  lookbookImages = lookbookResult;

  return { outfitImages, lookbookImages };
}

async function fetchLookbookImages(
  lookbooks: any[],
  outfitsData: any[]
): Promise<Map<string, string | null>> {
  const localLookbookImages = new Map<string, string | null>();
  if (lookbooks.length === 0 || outfitsData.length === 0) return localLookbookImages;

  const { data: lookbookOutfitsData } = await supabase
    .from('lookbook_outfits')
    .select('lookbook_id, outfit_id, position')
    .in('lookbook_id', lookbooks.map((lb) => lb.id))
    .order('position', { ascending: true });

  const firstOutfitsByLookbook = new Map<string, string>();
  (lookbookOutfitsData || []).forEach((lo: any) => {
    if (!firstOutfitsByLookbook.has(lo.lookbook_id)) {
      firstOutfitsByLookbook.set(lo.lookbook_id, lo.outfit_id);
    }
  });

  const firstOutfits = Array.from(firstOutfitsByLookbook.values())
    .map((outfitId) => outfitsData.find((o) => o.id === outfitId))
    .filter(Boolean);

  try {
    const firstOutfitImages = await getOutfitCoverImages(firstOutfits, 'card');
    lookbooks.forEach((lookbook) => {
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

  return localLookbookImages;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useUserProfile({
  userId,
  currentUserId,
}: UseUserProfileProps): UseUserProfileReturn {
  const queryClient = useQueryClient();
  const isOwnProfile = currentUserId === userId;

  // Primary query: profile + outfits + lookbooks + wear counts
  const { data: coreData, isLoading, isFetching } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfileCore(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3,
  });

  // Dependent query: images (only runs after core data is available)
  const outfits = coreData?.outfits ?? [];
  const lookbooks = coreData?.lookbooks ?? [];
  const imageQueryEnabled = !!coreData && (outfits.length > 0 || lookbooks.length > 0);

  const { data: imageData } = useQuery({
    queryKey: ['userProfileImages', userId, outfits.length, lookbooks.length],
    queryFn: () => fetchUserProfileImages(outfits, lookbooks),
    enabled: imageQueryEnabled,
    staleTime: 1000 * 60 * 3,
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
    await queryClient.invalidateQueries({ queryKey: ['userProfileImages', userId] });
  }, [queryClient, userId]);

  const refreshContent = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
    await queryClient.invalidateQueries({ queryKey: ['userProfileImages', userId] });
  }, [queryClient, userId]);

  const emptyMap = useMemo(() => new Map<string, string | null>(), []);
  const emptyWearCounts = useMemo(() => new Map<string, number>(), []);

  return {
    profile: coreData?.profile ?? null,
    outfits,
    lookbooks,
    outfitImages: imageData?.outfitImages ?? emptyMap,
    lookbookImages: imageData?.lookbookImages ?? emptyMap,
    outfitWearCounts: coreData?.outfitWearCounts ?? emptyWearCounts,
    loading: isLoading,
    refreshingContent: isFetching && !isLoading,
    refresh,
    refreshContent,
    isOwnProfile,
  };
}

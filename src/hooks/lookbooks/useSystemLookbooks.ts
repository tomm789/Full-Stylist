/**
 * useSystemLookbooks Hook
 * Manages system lookbooks (favorites, recent, top)
 */

import { useState, useEffect } from 'react';
import { getSystemLookbookOutfits } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';

type SystemCategory = 'favorites' | 'recent' | 'top';

interface SystemLookbookData {
  category: SystemCategory;
  title: string;
  icon: string;
  outfits: any[];
  coverImageUrl: string | null;
}

interface UseSystemLookbooksProps {
  userId: string | undefined;
}

interface UseSystemLookbooksReturn {
  systemLookbooks: SystemLookbookData[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useSystemLookbooks({
  userId,
}: UseSystemLookbooksProps): UseSystemLookbooksReturn {
  const [systemLookbooks, setSystemLookbooks] = useState<SystemLookbookData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSystemLookbooks = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Load all system categories in parallel
      const [favoritesResult, recentResult, topResult] = await Promise.all([
        getSystemLookbookOutfits(userId, 'system_favorites'),
        getSystemLookbookOutfits(userId, 'system_recent'),
        getSystemLookbookOutfits(userId, 'system_top'),
      ]);

      // Get all outfits for mapping
      const { data: allOutfits } = await getUserOutfits(userId);
      const outfitMap = allOutfits
        ? new Map(allOutfits.map((o: any) => [o.id, o]))
        : new Map();

      const categories: {
        category: SystemCategory;
        title: string;
        icon: string;
        result: any;
      }[] = [
        { category: 'favorites', title: 'Favorites', icon: '❤️', result: favoritesResult },
        { category: 'recent', title: 'Recent', icon: '🕒', result: recentResult },
        { category: 'top', title: 'Top Rated', icon: '⭐', result: topResult },
      ];

      const lookbooksData: SystemLookbookData[] = categories
        .map(({ category, title, icon, result }) => {
          const outfitsWithData = result.data
            ? result.data.map((so: any) => outfitMap.get(so.outfit_id)).filter(Boolean)
            : [];

          return {
            category,
            title,
            icon,
            outfits: outfitsWithData,
            coverImageUrl: null,
          };
        })
        // Hide top rated if fewer than 3 outfits
        .filter((lb) => {
          if (lb.category === 'top') {
            return lb.outfits.length >= 3;
          }
          return true;
        });

      // Load cover images
      const lookbooksWithCovers = await Promise.all(
        lookbooksData.map(async (lookbook) => {
          const coverOutfit = lookbook.outfits[0] || null;
          const coverImageUrl = coverOutfit
            ? await getOutfitCoverImageUrl(coverOutfit)
            : null;
          return {
            ...lookbook,
            coverImageUrl,
          };
        })
      );

      setSystemLookbooks(lookbooksWithCovers);
    } catch (error) {
      console.error('Error loading system lookbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await loadSystemLookbooks();
  };

  useEffect(() => {
    loadSystemLookbooks();
  }, [userId]);

  return {
    systemLookbooks,
    loading,
    refresh,
  };
}

export type { SystemLookbookData, SystemCategory };

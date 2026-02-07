/**
 * useCalendarEntries Hook
 * Manages calendar entries and outfit images for a date range
 */

import { useState, useEffect, useRef } from 'react';
import { getCalendarEntries, CalendarEntry } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

interface UseCalendarEntriesProps {
  userId: string | undefined;
  startDate: string;
  endDate: string;
}

interface UseCalendarEntriesReturn {
  entries: Map<string, CalendarEntry[]>;
  outfitImages: Map<string, string | null>;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCalendarEntries({
  userId,
  startDate,
  endDate,
}: UseCalendarEntriesProps): UseCalendarEntriesReturn {
  const [entries, setEntries] = useState<Map<string, CalendarEntry[]>>(new Map());
  const [outfitImages, setOutfitImages] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const loadEntries = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const shouldShowLoading = !hasLoadedOnceRef.current;
    if (shouldShowLoading) {
      setLoading(true);
    }

    try {
      // Load all entries for the date range
      const { data: monthEntries } = await getCalendarEntries(userId, startDate, endDate);

      // Group entries by date
      const entriesMap = new Map<string, CalendarEntry[]>();
      if (monthEntries) {
        monthEntries.forEach((entry) => {
          const date = entry.calendar_day?.date || (entry as any).calendar_days?.date;
          if (date) {
            const existing = entriesMap.get(date) || [];
            existing.push(entry);
            entriesMap.set(date, existing);
          }
        });
      }

      setEntries(entriesMap);
      if (shouldShowLoading) {
        setLoading(false);
      }
      hasLoadedOnceRef.current = true;

      // Load outfit images without blocking scroll/navigation
      if (monthEntries) {
        loadOutfitImages(monthEntries);
      }
    } catch (error) {
      console.error('Error loading calendar entries:', error);
    } finally {
      if (shouldShowLoading) {
        setLoading(false);
      }
      hasLoadedOnceRef.current = true;
    }
  };

  const loadOutfitImages = async (entries: CalendarEntry[]) => {
    const imagesMap = new Map<string, string | null>();

    // Get unique outfit IDs
    const outfitIds = [...new Set(entries.filter((e) => e.outfit_id).map((e) => e.outfit_id!))];

    // Load cover images for all outfits in parallel
    const outfitPromises = outfitIds.map((outfitId) =>
      supabase
        .from('outfits')
        .select(
          'id, cover_image_id, cover_image:images!cover_image_id(storage_key, storage_bucket)'
        )
        .eq('id', outfitId)
        .single()
    );

    const outfitResults = await Promise.all(outfitPromises);

    for (const { data: outfit } of outfitResults) {
      const coverImage = Array.isArray(outfit?.cover_image) ? outfit?.cover_image?.[0] : outfit?.cover_image;
      if (coverImage?.storage_key) {
        const storageBucket = (coverImage as any).storage_bucket || 'media';
        const { data: urlData } = supabase.storage
          .from(storageBucket)
          .getPublicUrl((coverImage as any).storage_key);

        if (urlData?.publicUrl) {
          imagesMap.set(outfit.id, urlData.publicUrl);
        }
      }
    }

    setOutfitImages((prev) => {
      const next = new Map(prev);
      imagesMap.forEach((value, key) => {
        next.set(key, value);
      });
      return next;
    });
  };

  const refresh = async () => {
    await loadEntries();
  };

  useEffect(() => {
    loadEntries();
  }, [userId, startDate, endDate]);

  return {
    entries,
    outfitImages,
    loading,
    refresh,
  };
}

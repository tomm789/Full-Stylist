/**
 * useCalendarEntries Hook
 * Manages calendar entries and outfit images for a date range
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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

interface CoverImageData {
  storage_key: string;
  storage_bucket: string;
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
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadOutfitImages = useCallback(async (calendarEntries: CalendarEntry[]) => {
    const outfitIds = [...new Set(calendarEntries.filter((e) => e.outfit_id).map((e) => e.outfit_id!))];

    if (outfitIds.length === 0) return;

    try {
      // Batch query: single request instead of N parallel requests
      const { data: outfits, error } = await supabase
        .from('outfits')
        .select('id, cover_image_id, cover_image:images!cover_image_id(storage_key, storage_bucket)')
        .in('id', outfitIds);

      if (error || !outfits || !isMountedRef.current) return;

      const imagesMap = new Map<string, string | null>();

      for (const outfit of outfits) {
        const coverImage: CoverImageData | undefined = Array.isArray(outfit.cover_image)
          ? outfit.cover_image[0]
          : (outfit.cover_image as CoverImageData | undefined);

        if (coverImage?.storage_key) {
          const { data: urlData } = supabase.storage
            .from(coverImage.storage_bucket || 'media')
            .getPublicUrl(coverImage.storage_key);

          if (urlData?.publicUrl) {
            imagesMap.set(outfit.id, urlData.publicUrl);
          }
        }
      }

      if (!isMountedRef.current) return;

      setOutfitImages((prev) => {
        const next = new Map(prev);
        imagesMap.forEach((value, key) => {
          next.set(key, value);
        });
        return next;
      });
    } catch (error) {
      console.error('Error loading outfit images:', error);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const shouldShowLoading = !hasLoadedOnceRef.current;
    if (shouldShowLoading) {
      setLoading(true);
    }

    try {
      const { data: monthEntries } = await getCalendarEntries(userId, startDate, endDate);

      if (!isMountedRef.current) return;

      // Group entries by date
      // Supabase returns the joined relation using the table name (calendar_days)
      const entriesMap = new Map<string, CalendarEntry[]>();
      if (monthEntries) {
        monthEntries.forEach((entry) => {
          const entryWithJoins = entry as CalendarEntry & { calendar_days?: { date: string } };
          const date = entryWithJoins.calendar_days?.date;
          if (date) {
            const existing = entriesMap.get(date) || [];
            existing.push(entry);
            entriesMap.set(date, existing);
          }
        });
      }

      setEntries(entriesMap);
      hasLoadedOnceRef.current = true;

      // Load outfit images in background without blocking
      if (monthEntries) {
        loadOutfitImages(monthEntries);
      }
    } catch (error) {
      console.error('Error loading calendar entries:', error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        hasLoadedOnceRef.current = true;
      }
    }
  }, [userId, startDate, endDate, loadOutfitImages]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const refresh = useCallback(async () => {
    await loadEntries();
  }, [loadEntries]);

  return {
    entries,
    outfitImages,
    loading,
    refresh,
  };
}

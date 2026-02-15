/**
 * useCalendarEntries Hook
 * Manages calendar entries and outfit images for a date range
 * Includes retry logic with exponential backoff for resilience
 */

import { useState, useEffect, useRef } from 'react';
import { getCalendarEntries, CalendarEntry } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';
import { CALENDAR_CONFIG } from '@/lib/calendar/config';

interface UseCalendarEntriesProps {
  userId: string | undefined;
  startDate: string;
  endDate: string;
}

interface UseCalendarEntriesReturn {
  entries: Map<string, CalendarEntry[]>;
  outfitImages: Map<string, string | null>;
  loading: boolean;
  error: Error | null;
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
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadEntriesInternal = async (isMounted: { current: boolean }, retryAttempt = 0): Promise<void> => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const shouldShowLoading = !hasLoadedOnceRef.current;
    if (shouldShowLoading) {
      setLoading(true);
    }

    try {
      const { data: monthEntries, error: fetchError } = await getCalendarEntries(userId, startDate, endDate);

      if (fetchError) {
        if (retryAttempt < CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS) {
          const delayMs = CALENDAR_CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
          console.warn(`Calendar entries load failed, retrying in ${delayMs}ms (attempt ${retryAttempt + 1}/${CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS}):`, fetchError);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          if (isMounted.current) {
            return loadEntriesInternal(isMounted, retryAttempt + 1);
          }
        } else {
          throw new Error(`Failed to load calendar entries after ${CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS} retries: ${fetchError.message}`);
        }
      }

      if (!isMounted.current) return;

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
      setError(null);
      if (shouldShowLoading) {
        setLoading(false);
      }
      hasLoadedOnceRef.current = true;

      if (monthEntries) {
        loadOutfitImages(monthEntries, isMounted.current);
      }
    } catch (err) {
      if (!isMounted.current) return;
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error loading calendar entries:', error);
      setError(error);
      if (shouldShowLoading) {
        setLoading(false);
      }
    } finally {
      if (isMounted.current && shouldShowLoading) {
        setLoading(false);
      }
      if (isMounted.current) {
        hasLoadedOnceRef.current = true;
      }
    }
  };

  const refresh = async (): Promise<void> => {
    const isMounted = { current: true };
    await loadEntriesInternal(isMounted);
  };

  const loadOutfitImages = async (entries: CalendarEntry[], isMounted: boolean) => {
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

    // Cancel if component unmounted while promises were pending
    if (!isMounted) return;

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

    // Only update state if component is still mounted
    if (isMounted) {
      setOutfitImages((prev) => {
        const next = new Map(prev);
        imagesMap.forEach((value, key) => {
          next.set(key, value);
        });
        return next;
      });
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    loadEntriesInternal(isMounted);

    return () => {
      isMounted.current = false;
    };
  }, [userId, startDate, endDate]);

  return {
    entries,
    outfitImages,
    loading,
    error,
    refresh,
  };
}

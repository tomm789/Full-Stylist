/**
 * useCalendarEntries Hook
 * Manages calendar entries and outfit images for a date range
 * Includes retry logic with exponential backoff for resilience
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedOnceRef = useRef(false);
  const isMountedRef = useRef(true);

  const loadEntriesInternal = async (mountedRef: { current: boolean }, retryAttempt = 0): Promise<void> => {
    if (!userId) {
      if (mountedRef.current) {
        setLoading(false);
      }
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
                    if (__DEV__) console.warn(`Calendar entries load failed, retrying in ${delayMs}ms (attempt ${retryAttempt + 1}/${CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS}):`, fetchError);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          if (mountedRef.current) {
            return loadEntriesInternal(mountedRef, retryAttempt + 1);
          }
        } else {
          throw new Error(`Failed to load calendar entries after ${CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS} retries: ${fetchError.message}`);
        }
      }

      if (!mountedRef.current) return;

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
      setError(null);
      if (shouldShowLoading) {
        setLoading(false);
      }
      hasLoadedOnceRef.current = true;

      if (monthEntries) {
        void loadOutfitImages(monthEntries, mountedRef);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Error loading calendar entries:', error);
      setError(error);
      if (shouldShowLoading) {
        setLoading(false);
      }
    } finally {
      if (mountedRef.current && shouldShowLoading) {
        setLoading(false);
      }
      if (mountedRef.current) {
        hasLoadedOnceRef.current = true;
      }
    }
  };

  const refresh = async (): Promise<void> => {
    await loadEntriesInternal(isMountedRef);
  };

  const loadOutfitImages = async (
    entries: CalendarEntry[],
    mountedRef: { current: boolean }
  ) => {
    const imagesMap = new Map<string, string | null>();

    // Get unique outfit IDs
    const outfitIds = [...new Set(entries.filter((e) => e.outfit_id).map((e) => e.outfit_id!))];

    // Load cover images for all outfits in parallel with timeout
    const outfitPromises = outfitIds.map((outfitId) =>
      Promise.race([
        supabase
          .from('outfits')
          .select(
            'id, cover_image_id, cover_image:images!cover_image_id(storage_key, storage_bucket)'
          )
          .eq('id', outfitId)
          .single(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Outfit ${outfitId} load timeout after ${CALENDAR_CONFIG.OUTFIT_LOAD_TIMEOUT_MS}ms`)), CALENDAR_CONFIG.OUTFIT_LOAD_TIMEOUT_MS)
        ),
      ]).catch(() => ({ data: null, error: 'timeout' })) // Graceful fallback if timeout occurs
    );

    const outfitResults = await Promise.all(outfitPromises);

    // Cancel if component unmounted while promises were pending
    if (!mountedRef.current) return;

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
    if (mountedRef.current) {
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
    isMountedRef.current = true;
    void loadEntriesInternal(isMountedRef);

    return () => {
      isMountedRef.current = false;
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

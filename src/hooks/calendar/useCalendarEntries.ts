/**
 * useCalendarEntries Hook
 * Manages calendar entries and outfit images for a date range
 * Includes retry logic with exponential backoff for resilience
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

interface CalendarEntriesQueryData {
  entries: Map<string, CalendarEntry[]>;
  outfitImages: Map<string, string | null>;
}

async function fetchWithRetry(
  userId: string,
  startDate: string,
  endDate: string,
  retryAttempt = 0
): Promise<CalendarEntry[]> {
  const { data: monthEntries, error: fetchError } = await getCalendarEntries(userId, startDate, endDate);

  if (fetchError) {
    if (retryAttempt < CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS) {
      const delayMs = CALENDAR_CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryAttempt);
      if (__DEV__) console.warn(`Calendar entries load failed, retrying in ${delayMs}ms (attempt ${retryAttempt + 1}/${CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS}):`, fetchError);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return fetchWithRetry(userId, startDate, endDate, retryAttempt + 1);
    }
    throw new Error(`Failed to load calendar entries after ${CALENDAR_CONFIG.MAX_RETRY_ATTEMPTS} retries: ${fetchError.message}`);
  }

  return monthEntries || [];
}

async function loadOutfitImages(entries: CalendarEntry[]): Promise<Map<string, string | null>> {
  const imagesMap = new Map<string, string | null>();
  const outfitIds = [...new Set(entries.filter((e) => e.outfit_id).map((e) => e.outfit_id!))];

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
    ]).catch(() => ({ data: null, error: 'timeout' } as { data: any; error: string }))
  );

  const outfitResults = await Promise.all(outfitPromises);

  for (const result of outfitResults) {
    const outfit = (result as any).data;
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

  return imagesMap;
}

export function useCalendarEntries({
  userId,
  startDate,
  endDate,
}: UseCalendarEntriesProps): UseCalendarEntriesReturn {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['calendarEntries', userId, startDate, endDate] as const,
    [userId, startDate, endDate]
  );

  const { data, isLoading, error: queryError } = useQuery<CalendarEntriesQueryData>({
    queryKey,
    queryFn: async () => {
      const monthEntries = await fetchWithRetry(userId!, startDate, endDate);

      const entriesMap = new Map<string, CalendarEntry[]>();
      monthEntries.forEach((entry) => {
        const entryWithJoins = entry as CalendarEntry & { calendar_days?: { date: string } };
        const date = entryWithJoins.calendar_days?.date;
        if (date) {
          const existing = entriesMap.get(date) || [];
          existing.push(entry);
          entriesMap.set(date, existing);
        }
      });

      const outfitImages = await loadOutfitImages(monthEntries);

      return { entries: entriesMap, outfitImages };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutes
    retry: false, // We handle retries internally with exponential backoff
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  return {
    entries: data?.entries ?? new Map(),
    outfitImages: data?.outfitImages ?? new Map(),
    loading: isLoading,
    error: queryError as Error | null,
    refresh,
  };
}

/**
 * useDescriptionPolling
 * Shared hook that polls Supabase every 500ms for outfit description data
 * written by the AI background worker after generation completes.
 * Stops automatically on success or after 30 seconds.
 */

import { useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  outfitDescriptionToGenerationMessages,
  type OutfitDescription,
  type GenerationMessage,
} from '@/lib/outfits/outfitDescriptionMessages';

const POLL_MAX_MS = 30_000;
const POLL_INTERVAL_MS = 500;

interface UseDescriptionPollingOptions {
  /**
   * Called once when the outfit description becomes available.
   * Receives the parsed description and the pre-computed drip messages so the
   * caller can drive its own UI state (phase changes, active message updates).
   */
  onSuccess: (description: OutfitDescription, messages: GenerationMessage[]) => void;
}

export function useDescriptionPolling({ onSuccess }: UseDescriptionPollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const outfitIdRef = useRef<string | null>(null);
  // Stable ref so `start` doesn't need onSuccess in its dep array
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const stop = useCallback(() => {
    if (intervalRef.current == null) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    const outfitId = outfitIdRef.current;
    startedAtRef.current = null;
    outfitIdRef.current = null;
    if (outfitId) {
      console.debug('[outfit_render_timing] description_poll_stopped', {
        outfitId,
        reason: 'cleanup',
      });
    }
  }, []);

  // Auto-clean on unmount
  useEffect(() => () => stop(), [stop]);

  const start = useCallback((outfitId: string) => {
    if (intervalRef.current != null) return;

    startedAtRef.current = Date.now();
    outfitIdRef.current = outfitId;
    console.debug('[outfit_render_timing] description_poll_started', { outfitId });

    intervalRef.current = setInterval(async () => {
      const started = startedAtRef.current;
      const elapsed = started != null ? Date.now() - started : 0;

      if (elapsed >= POLL_MAX_MS) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        startedAtRef.current = null;
        outfitIdRef.current = null;
        console.debug('[outfit_render_timing] description_poll_timeout', {
          outfitId,
          elapsedMs: elapsed,
        });
        return;
      }

      try {
        const { data } = await supabase
          .from('outfits')
          .select('description, occasions, style_tags, season, description_generated_at')
          .eq('id', outfitId)
          .maybeSingle();

        if (data?.description_generated_at) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          startedAtRef.current = null;
          outfitIdRef.current = null;
          console.debug('[outfit_render_timing] description_poll_stopped', {
            outfitId,
            reason: 'success',
          });

          const description: OutfitDescription = {
            description: data.description ?? '',
            occasions: data.occasions ?? [],
            styleTags: data.style_tags ?? [],
            season: data.season ?? 'all-season',
          };

          const messages = outfitDescriptionToGenerationMessages(description);
          onSuccessRef.current(description, messages);
        }
      } catch (error) {
        console.error('[useDescriptionPolling] Poll error:', error);
      }
    }, POLL_INTERVAL_MS);
  }, []);

  return { start, stop };
}

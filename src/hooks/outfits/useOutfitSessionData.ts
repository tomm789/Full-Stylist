/**
 * useOutfitSessionData
 * Manages outfit generation session state and data loading.
 * Mirrors src/hooks/headshot/useHeadshotSessionData.ts for consistency.
 *
 * Owns: sessionId, variations, variationUrls.
 * Exposes resolveImageUrl and loadVariations for use by the generation hook.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getActiveOutfitSession,
  createOutfitSession,
  endOutfitSession,
  listOutfitVariations,
  resolveImageUrls,
  type OutfitGenerationSession,
  type OutfitGenerationVariation,
} from '@/lib/outfits/sessions';
import { supabase } from '@/lib/supabase';
import { getPublicImageUrl } from '@/lib/images';

export type UseOutfitSessionDataParams = {
  userId: string | null;
  /** Only load/manage sessions when the outfit creator is active. */
  enabled: boolean;
};

export function useOutfitSessionData({
  userId,
  enabled,
}: UseOutfitSessionDataParams) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variations, setVariations] = useState<OutfitGenerationVariation[]>([]);
  const [variationUrls, setVariationUrls] = useState<Map<string, string>>(
    new Map()
  );

  // Ref kept in sync so callbacks always access the latest session ID
  // without needing to be re-created on every state change.
  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);

  // ── Utilities ──────────────────────────────────────────────────────────────

  const resolveImageUrl = useCallback(
    async (imageId: string | null): Promise<string | null> => {
      if (!imageId) return null;
      const { data: image } = await supabase
        .from('images')
        .select('id, storage_bucket, storage_key')
        .eq('id', imageId)
        .maybeSingle();
      return image ? getPublicImageUrl(image) : null;
    },
    []
  );

  const loadVariations = useCallback(
    async (currentSessionId: string | null) => {
      if (!currentSessionId) {
        setVariations([]);
        setVariationUrls(new Map());
        return;
      }

      const data = await listOutfitVariations(currentSessionId);
      setVariations(data);

      const imageIds = data
        .map((v) => v.image_id)
        .filter(Boolean) as string[];
      const urlMap = await resolveImageUrls(imageIds);
      setVariationUrls(urlMap);
    },
    []
  );

  // ── Session lifecycle ──────────────────────────────────────────────────────

  /**
   * Find or create an active session for the current user.
   * Called lazily on first generation — not on mount.
   */
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (!userId) return null;

    // Reuse an existing open session
    if (sessionId) return sessionId;

    const existing = await getActiveOutfitSession(userId);
    if (existing) {
      setSessionId(existing.id);
      sessionIdRef.current = existing.id;
      await loadVariations(existing.id);
      return existing.id;
    }

    const created = await createOutfitSession(userId);
    if (created) {
      setSessionId(created.id);
      sessionIdRef.current = created.id;
      return created.id;
    }
    return null;
  }, [userId, sessionId, loadVariations]);

  const endSession = useCallback(async () => {
    if (sessionId) {
      await endOutfitSession(sessionId);
    }
    setSessionId(null);
    sessionIdRef.current = null;
    setVariations([]);
    setVariationUrls(new Map());
  }, [sessionId]);

  /** Reload variations for the current session (uses ref — safe in stale closures). */
  const refreshVariations = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid) await loadVariations(sid);
  }, [loadVariations]);

  // ── Load existing session on mount (if enabled) ────────────────────────────

  useEffect(() => {
    if (!enabled || !userId) {
      // Don't clear session here — creator may re-enable quickly
      return;
    }

    let cancelled = false;
    (async () => {
      const existing = await getActiveOutfitSession(userId);
      if (cancelled) return;
      if (existing) {
        setSessionId(existing.id);
        await loadVariations(existing.id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    sessionId,
    setSessionId,
    variations,
    setVariations,
    variationUrls,
    setVariationUrls,
    resolveImageUrl,
    loadVariations,
    ensureSession,
    endSession,
    refreshVariations,
  };
}

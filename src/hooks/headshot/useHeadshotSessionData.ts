/**
 * useHeadshotSessionData
 * Manages headshot generation session state and data loading.
 * Owns: sessionId, variations, variationUrls, hiddenVariationIds, selfieImageId, selfieImageUrl.
 * Exposes resolveImageUrl and loadVariations for use by the generation hook.
 */

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getLatestHeadshotGenerationSession,
  listHeadshotGenerationVariations,
  type HeadshotGenerationVariation,
} from '@/lib/headshot/generation';
import { getVariationByImageId } from '@/lib/headshot/generation';
import { getPublicImageUrl } from '@/lib/images';
import { getUserSettings } from '@/lib/settings';
import type { PreviewSource } from './useHairAndMakeup';

/**
 * Session-scoped flag: true after the user has visited the hair & makeup screen this session.
 * Prevents overwriting in-progress selections on repeated navigations back to the screen.
 */
let hasVisitedHairMakeupThisSession = false;

export function clearHairMakeupSessionVisited(): void {
  hasVisitedHairMakeupThisSession = false;
}

type SessionRestoredData = {
  hairPresetIds: string[];
  makeupPresetIds: string[];
  customDescription: string;
};

export type UseHeadshotSessionDataParams = {
  userId: string | null;
  baseImageId: string | null;
  previewSource: PreviewSource;
  previewVariationId: string | null;
  previewImageId: string | null;
  selfieUploadedUri: string | undefined;
  setBaseImageId: (id: string | null) => void;
  setPreviewImageId: (id: string | null) => void;
  setPreviewImageUrl: (url: string | null) => void;
  setPreviewVariationId: (id: string | null) => void;
  setPreviewSource: (source: PreviewSource) => void;
  setEditorOpen: (open: boolean) => void;
  setActiveImageVariation: (v: HeadshotGenerationVariation | null) => void;
  clearSelfieUploadImage: () => void;
  onSessionRestored: (data: SessionRestoredData) => void;
};

export function useHeadshotSessionData({
  userId,
  baseImageId,
  previewSource,
  previewVariationId,
  previewImageId,
  selfieUploadedUri,
  setBaseImageId,
  setPreviewImageId,
  setPreviewImageUrl,
  setPreviewVariationId,
  setPreviewSource,
  setEditorOpen,
  setActiveImageVariation,
  clearSelfieUploadImage,
  onSessionRestored,
}: UseHeadshotSessionDataParams) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variations, setVariations] = useState<HeadshotGenerationVariation[]>([]);
  const [variationUrls, setVariationUrls] = useState<Map<string, string | null>>(new Map());
  const [hiddenVariationIds, setHiddenVariationIds] = useState<string[]>([]);
  const [selfieImageId_state, setSelfieImageId] = useState<string | null>(null);
  const [selfieImageUrl, setSelfieImageUrl] = useState<string | null>(null);

  // ── Utilities ──────────────────────────────────────────────────────────────

  const resolveImageUrl = async (imageId: string | null): Promise<string | null> => {
    if (!imageId) return null;
    const { data: image } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key')
      .eq('id', imageId)
      .maybeSingle();
    return image ? getPublicImageUrl(image) : null;
  };

  const loadVariations = async (currentSessionId: string | null) => {
    if (!currentSessionId) {
      setVariations([]);
      setVariationUrls(new Map());
      return;
    }
    const data = await listHeadshotGenerationVariations(currentSessionId);
    setVariations(data);

    const imageIds = data.map((item) => item.image_id).filter(Boolean) as string[];
    if (imageIds.length === 0) {
      setVariationUrls(new Map());
      return;
    }

    const { data: images } = await supabase
      .from('images')
      .select('id, storage_bucket, storage_key')
      .in('id', imageIds);

    const urlMap = new Map<string, string | null>();
    images?.forEach((image) => {
      urlMap.set(image.id, getPublicImageUrl(image));
    });
    setVariationUrls(urlMap);
  };

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadSelfie = async () => {
    if (!userId) return;
    const { data: settings } = await getUserSettings(userId);
    const nextSelfieId = settings?.selfie_image_id ?? null;
    setSelfieImageId(nextSelfieId);
    const nextSelfieUrl = await resolveImageUrl(nextSelfieId);
    setSelfieImageUrl(nextSelfieUrl);

    if (previewSource === 'none' || previewSource === 'selfie') {
      setBaseImageId(nextSelfieId);
      setPreviewImageId(nextSelfieId);
      setPreviewImageUrl(nextSelfieUrl);
      setPreviewVariationId(null);
      setPreviewSource(nextSelfieId ? 'selfie' : 'none');
    }
  };

  const loadSession = async () => {
    if (!userId || !baseImageId) {
      setSessionId(null);
      setVariations([]);
      setVariationUrls(new Map());
      onSessionRestored({ hairPresetIds: [], makeupPresetIds: [], customDescription: '' });
      return;
    }
    const session = await getLatestHeadshotGenerationSession(userId, baseImageId);
    if (session) {
      setSessionId(session.id);
      if (hasVisitedHairMakeupThisSession) {
        // Subsequent navigation back — restore last-used selections from the session.
        const input = session.input_json || {};
        onSessionRestored({
          hairPresetIds: input.hairPresetIds || [],
          makeupPresetIds: input.makeupPresetIds || [],
          customDescription: input.customDescription || '',
        });
      } else {
        // First visit this app-session — preserve any in-progress state, just mark visited.
        hasVisitedHairMakeupThisSession = true;
      }
      await loadVariations(session.id);
    } else {
      setSessionId(null);
      setVariations([]);
      setVariationUrls(new Map());
      onSessionRestored({ hairPresetIds: [], makeupPresetIds: [], customDescription: '' });
    }
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    loadSession();
  }, [userId, baseImageId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    loadSelfie();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!selfieUploadedUri) return;
    setPreviewImageId(null);
    setPreviewImageUrl(selfieUploadedUri);
    setPreviewVariationId(null);
    setPreviewSource('upload');
    setEditorOpen(false);
    setBaseImageId(null);
  }, [selfieUploadedUri]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!previewVariationId || previewSource !== 'variation') return;
    const variation = variations.find((item) => item.id === previewVariationId);
    if (!variation?.image_id) return;
    const nextUrl = variationUrls.get(variation.image_id) || null;
    if (nextUrl) setPreviewImageUrl(nextUrl);
  }, [previewVariationId, previewSource, variationUrls, variations]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setPreviewVariationId(null);
    setHiddenVariationIds([]);
  }, [baseImageId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!previewImageId || previewImageId === selfieImageId_state) {
      setActiveImageVariation(null);
      return;
    }
    let cancelled = false;
    getVariationByImageId(previewImageId).then((variation) => {
      if (!cancelled) setActiveImageVariation(variation);
    });
    return () => { cancelled = true; };
  }, [previewImageId, selfieImageId_state]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    sessionId,
    setSessionId,
    variations,
    setVariations,
    variationUrls,
    setVariationUrls,
    hiddenVariationIds,
    setHiddenVariationIds,
    selfieImageId: selfieImageId_state,
    setSelfieImageId,
    selfieImageUrl,
    setSelfieImageUrl,
    resolveImageUrl,
    loadVariations,
  };
}

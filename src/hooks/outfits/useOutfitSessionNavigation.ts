/**
 * useOutfitSessionNavigation
 * Manages variation-navigation state for outfit generation sessions.
 * Mirrors src/hooks/headshot/useVariationNavigation.ts for consistency.
 *
 * Owns: completedVariations, currentIndex, navigation handlers,
 *       and the preview state for the currently viewed variation.
 */

import { useCallback, useMemo, useState } from 'react';
import type { OutfitGenerationVariation } from '@/lib/outfits/sessions';

export type OutfitSessionPreview = {
  variationId: string | null;
  imageId: string | null;
  imageUrl: string | null;
};

export type UseOutfitSessionNavigationParams = {
  variations: OutfitGenerationVariation[];
  variationUrls: Map<string, string>;
  resolveImageUrl: (imageId: string | null) => Promise<string | null>;
};

export function useOutfitSessionNavigation({
  variations,
  variationUrls,
  resolveImageUrl,
}: UseOutfitSessionNavigationParams) {
  const [preview, setPreview] = useState<OutfitSessionPreview>({
    variationId: null,
    imageId: null,
    imageUrl: null,
  });

  // ── Derived state ──────────────────────────────────────────────────────────

  // Newest-first: index 0 = most recent
  const completedVariations = useMemo(
    () => variations.filter((v) => v.status === 'complete' && v.image_id),
    [variations]
  );

  const currentIndex = useMemo(() => {
    if (!preview.variationId) return -1;
    return completedVariations.findIndex((v) => v.id === preview.variationId);
  }, [completedVariations, preview.variationId]);

  const showNav = completedVariations.length > 0;

  // 'back' = older (index + 1), 'forward' = newer (index - 1)
  const canNavigateBack =
    currentIndex === -1
      ? completedVariations.length > 0
      : currentIndex < completedVariations.length - 1;
  const canNavigateForward = currentIndex > 0;

  // ── Actions ────────────────────────────────────────────────────────────────

  const selectVariation = useCallback(
    async (variation: OutfitGenerationVariation) => {
      const imageId = variation.image_id;
      if (!imageId) return;

      let imageUrl = variationUrls.get(imageId) ?? null;
      if (!imageUrl) {
        imageUrl = await resolveImageUrl(imageId);
      }

      setPreview({
        variationId: variation.id,
        imageId,
        imageUrl,
      });
    },
    [variationUrls, resolveImageUrl]
  );

  const handleNavigate = useCallback(
    (direction: 'back' | 'forward') => {
      if (completedVariations.length === 0) return;

      if (currentIndex === -1) {
        // Not currently on a variation — jump to most recent
        if (direction === 'back') void selectVariation(completedVariations[0]);
        return;
      }

      const nextIndex =
        direction === 'back' ? currentIndex + 1 : currentIndex - 1;
      const nextVariation = completedVariations[nextIndex];
      if (nextVariation) void selectVariation(nextVariation);
    },
    [completedVariations, currentIndex, selectVariation]
  );

  /** Set preview to the most recent completed variation. */
  const selectLatest = useCallback(() => {
    if (completedVariations.length > 0) {
      void selectVariation(completedVariations[0]);
    }
  }, [completedVariations, selectVariation]);

  const clearPreview = useCallback(() => {
    setPreview({ variationId: null, imageId: null, imageUrl: null });
  }, []);

  return {
    preview,
    completedVariations,
    currentIndex,
    showNav,
    canNavigateBack,
    canNavigateForward,
    selectVariation,
    handleNavigate,
    selectLatest,
    clearPreview,
  };
}

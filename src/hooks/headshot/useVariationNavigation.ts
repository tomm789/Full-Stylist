/**
 * useVariationNavigation
 * Manages variation-navigation state for the Hair & Make-Up screen.
 * Owns: setPreviewFromVariation, handleNavigateGeneration, and the derived
 *       navigation flags (canNavigateBack, canNavigateForward, etc.).
 */

import { useCallback, useMemo } from 'react';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';
import type { PreviewSource } from '@/lib/headshot/hairAndMakeupTypes';

export type UseVariationNavigationParams = {
  variations: HeadshotGenerationVariation[];
  hiddenVariationIds: string[];
  selfieImageId: string | null;
  previewVariationId: string | null;
  variationUrls: Map<string, string>;
  setVariationUrls: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  setPreviewImageId: (id: string | null) => void;
  setPreviewImageUrl: (url: string | null) => void;
  setPreviewVariationId: (id: string | null) => void;
  setPreviewSource: (source: PreviewSource) => void;
  resolveImageUrl: (imageId: string) => Promise<string | null>;
};

export function useVariationNavigation({
  variations,
  hiddenVariationIds,
  selfieImageId,
  previewVariationId,
  variationUrls,
  setVariationUrls,
  setPreviewImageId,
  setPreviewImageUrl,
  setPreviewVariationId,
  setPreviewSource,
  resolveImageUrl,
}: UseVariationNavigationParams) {
  const completedVariations = useMemo(
    () =>
      variations.filter((v) => {
        if (v.status !== 'complete' || !v.image_id) return false;
        if (hiddenVariationIds.includes(v.id)) return false;
        if (selfieImageId && v.image_id === selfieImageId) return false;
        return true;
      }),
    [variations, hiddenVariationIds, selfieImageId]
  );

  const previewGenerationIndex = useMemo(() => {
    if (!previewVariationId) return -1;
    return completedVariations.findIndex((v) => v.id === previewVariationId);
  }, [completedVariations, previewVariationId]);

  const setPreviewFromVariation = useCallback(async (variation: HeadshotGenerationVariation) => {
    const imageId = variation.image_id;
    if (!imageId) return;
    let imageUrl = variationUrls.get(imageId) || null;
    if (!imageUrl) {
      imageUrl = await resolveImageUrl(imageId);
      if (imageUrl) {
        setVariationUrls((prev) => {
          const next = new Map(prev);
          next.set(imageId, imageUrl as string);
          return next;
        });
      }
    }
    if (!imageUrl) return;
    setPreviewImageId(imageId);
    setPreviewImageUrl(imageUrl);
    setPreviewVariationId(variation.id);
    setPreviewSource('variation');
  }, [variationUrls, resolveImageUrl, setVariationUrls, setPreviewImageId, setPreviewImageUrl, setPreviewVariationId, setPreviewSource]);

  // completedVariations is newest-first: index 0 = most recent.
  // 'back' = older (index + 1), 'forward' = newer (index - 1).
  const handleNavigateGeneration = useCallback((direction: 'back' | 'forward') => {
    if (completedVariations.length === 0) return;
    if (previewGenerationIndex === -1) {
      if (direction === 'back') void setPreviewFromVariation(completedVariations[0]);
      return;
    }
    const nextIndex =
      direction === 'back' ? previewGenerationIndex + 1 : previewGenerationIndex - 1;
    const nextVariation = completedVariations[nextIndex];
    if (nextVariation) void setPreviewFromVariation(nextVariation);
  }, [completedVariations, previewGenerationIndex, setPreviewFromVariation]);

  const showGenerationNav = completedVariations.length > 0;
  const canNavigateBack =
    previewGenerationIndex === -1
      ? completedVariations.length > 0
      : previewGenerationIndex < completedVariations.length - 1;
  const canNavigateForward = previewGenerationIndex > 0;

  // Handles swiping to a different image in the face carousel.
  // Resolves whether the item is a selfie, a completed variation, or a saved headshot.
  const handleSwipeIndexChange = useCallback(
    (item: { id: string; url: string | null }) => {
      setPreviewImageId(item.id);
      setPreviewImageUrl(item.url || null);
      if (selfieImageId && item.id === selfieImageId) {
        setPreviewVariationId(null);
        setPreviewSource('selfie');
        return;
      }
      const matchedVariation =
        variations.find((v) => v.image_id === item.id && v.status === 'complete') || null;
      if (matchedVariation) {
        setPreviewVariationId(matchedVariation.id);
        setPreviewSource('variation');
        return;
      }
      setPreviewVariationId(null);
      setPreviewSource('headshot');
    },
    [selfieImageId, variations, setPreviewImageId, setPreviewImageUrl, setPreviewVariationId, setPreviewSource]
  );

  return {
    completedVariations,
    previewGenerationIndex,
    showGenerationNav,
    canNavigateBack,
    canNavigateForward,
    setPreviewFromVariation,
    handleNavigateGeneration,
    handleSwipeIndexChange,
  };
}

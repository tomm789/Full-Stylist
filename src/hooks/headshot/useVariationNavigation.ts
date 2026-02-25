/**
 * useVariationNavigation
 * Manages variation-navigation state for the Hair & Make-Up screen.
 * Owns: setPreviewFromVariation, handleNavigateGeneration, and the derived
 *       navigation flags (canNavigateBack, canNavigateForward, etc.).
 */

import { useMemo } from 'react';
import type { HeadshotGenerationVariation } from '@/lib/headshot/generation';

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
  setPreviewSource: (source: 'none' | 'selfie' | 'headshot' | 'variation' | 'upload') => void;
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

  const setPreviewFromVariation = async (variation: HeadshotGenerationVariation) => {
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
  };

  const handleNavigateGeneration = (direction: 'back' | 'forward') => {
    if (completedVariations.length === 0) return;
    if (previewGenerationIndex === -1) {
      if (direction === 'back') void setPreviewFromVariation(completedVariations[0]);
      return;
    }
    const nextIndex =
      direction === 'back' ? previewGenerationIndex + 1 : previewGenerationIndex - 1;
    const nextVariation = completedVariations[nextIndex];
    if (nextVariation) void setPreviewFromVariation(nextVariation);
  };

  const showGenerationNav = completedVariations.length > 0;
  const canNavigateBack =
    previewGenerationIndex === -1
      ? completedVariations.length > 0
      : previewGenerationIndex < completedVariations.length - 1;
  const canNavigateForward = previewGenerationIndex > 0;

  return {
    completedVariations,
    previewGenerationIndex,
    showGenerationNav,
    canNavigateBack,
    canNavigateForward,
    setPreviewFromVariation,
    handleNavigateGeneration,
  };
}

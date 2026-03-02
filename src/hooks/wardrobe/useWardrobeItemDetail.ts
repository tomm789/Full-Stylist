/**
 * useWardrobeItemDetail Hook
 * Thin composition layer for wardrobe item detail data + job orchestration.
 */

import { useRef } from 'react';
import { useWardrobeItemData } from './useWardrobeItemData';
import { useWardrobeItemDisplay } from './useWardrobeItemDisplay';
import { usePeriodicRefresh } from './usePeriodicRefresh';
import { useWardrobeItemCache } from './useWardrobeItemCache';
import { useWardrobeItemJobs, type WardrobeItemJobControls } from './useWardrobeItemJobs';

interface UseWardrobeItemDetailProps {
  itemId: string | undefined;
  userId: string | undefined;
}

export function useWardrobeItemDetail({ itemId, userId }: UseWardrobeItemDetailProps) {
  const data = useWardrobeItemData({ itemId });
  const { activeImageId, displayImagesOrdered } = useWardrobeItemDisplay(data.displayImages);
  const jobControlsRef = useRef<WardrobeItemJobControls | null>(null);

  const periodic = usePeriodicRefresh(itemId, userId, {
    refreshImages: data.refreshImages,
    refreshAttributes: data.refreshAttributes,
    onImageRefreshTimeout: () => {
      jobControlsRef.current?.setIsGeneratingProductShot(false);
    },
  });

  const cache = useWardrobeItemCache({ itemId, userId, data, periodic, jobControlsRef });
  const jobs = useWardrobeItemJobs({ itemId, userId, data, periodic, cache });
  jobControlsRef.current = jobs.controls;

  return {
    item: data.item,
    category: data.category,
    allImages: data.allImages,
    displayImages: displayImagesOrdered,
    activeImageId,
    attributes: data.attributes,
    tags: data.tags,
    loading: cache.loading,
    isGeneratingProductShot: jobs.isGeneratingProductShot,
    isGeneratingDetails: !!jobs.generateJobId && jobs.isGeneratingProductShot,
    generationFailed: jobs.generationFailed,
    retryGeneration: jobs.retryGeneration,
    refreshImages: data.refreshImages,
    refreshAttributes: data.refreshAttributes,
    initialImageDataUri: cache.initialImageDataUri,
    initialTitle: cache.initialTitle,
    initialDescription: cache.initialDescription,
    jobSucceededAt: cache.jobSucceededAt,
    lastSucceededJobId: cache.lastSucceededJobId,
    lastSucceededJobFeedbackAt: cache.lastSucceededJobFeedbackAt,
    lastSucceededJobType: cache.lastSucceededJobType,
  };
}

/**
 * useWardrobeItemDisplay Hook
 * Manage active image selection and display ordering for wardrobe item carousel
 */

import { useState, useEffect, useMemo } from 'react';

interface WardrobeItemImage {
  id: string;
  image_id: string;
  type: string;
  image: any;
}

export function useWardrobeItemDisplay(images: WardrobeItemImage[]) {
  /** Which image to show first in carousel (image_id). Default: uploaded; switch to generated when available. */
  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  // Single source of truth for which image is "active" in carousel: prefer generated (product_shot) when present
  useEffect(() => {
    const imgs = images;
    if (!imgs?.length) return;
    const productShot = imgs.find((i) => i.type === 'product_shot');
    const generatedIndex = productShot ? imgs.findIndex((i) => i.type === 'product_shot') : -1;
    const newActiveId = productShot ? productShot.image_id : imgs[0].image_id;
    setActiveImageId((prev) => {
      if (prev === newActiveId) return prev;
      if (__DEV__) {
        console.log('[ItemCarousel] activeImageId changed', {
          from: prev,
          to: newActiveId,
          generatedIndex,
          hasProductShot: !!productShot,
        });
      }
      return newActiveId;
    });
  }, [images]);

  // Reorder so active image is first; carousel shows index 0 = active
  const displayImagesOrdered = useMemo(() => {
    const imgs = images;
    if (!imgs?.length || !activeImageId) return imgs;
    const activeIndex = imgs.findIndex((i) => i.image_id === activeImageId);
    if (activeIndex <= 0) return imgs;
    const active = imgs[activeIndex];
    const rest = imgs.filter((_, idx) => idx !== activeIndex);
    return [active, ...rest];
  }, [images, activeImageId]);

  return { activeImageId, setActiveImageId, displayImagesOrdered };
}

/**
 * Hook for managing slideshow state and auto-play
 */

import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { getLookbook } from '@/lib/lookbooks';
import { getUserOutfits } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';

export const useFeedSlideshow = (userId: string | undefined) => {
  const [slideshowVisible, setSlideshowVisible] = useState(false);
  const [slideshowLoading, setSlideshowLoading] = useState(false);
  const [slideshowOutfits, setSlideshowOutfits] = useState<any[]>([]);
  const [slideshowImages, setSlideshowImages] = useState<Map<string, string | null>>(new Map());
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);

  const openSlideshow = async (lookbookId: string) => {
    if (!userId) return;

    setSlideshowLoading(true);
    
    try {
      const { data } = await getLookbook(lookbookId);
      let outfitsToShow: any[] = [];
      
      if (data && data.outfits.length > 0) {
        // Get outfits from the lookbook owner (not current user!)
        const lookbookOwnerId = data.lookbook.owner_user_id;
        const { data: allOutfits } = await getUserOutfits(lookbookOwnerId);
        
        // DEBUG: Show what we got
        Alert.alert('Debug Info', 
          `Lookbook has ${data.outfits.length} outfit refs\n` +
          `Owner: ${lookbookOwnerId}\n` +
          `Got ${allOutfits?.length || 0} outfits from owner\n` +
          `Current user: ${userId}`
        );
        
        if (allOutfits) {
          const outfitMap = new Map(allOutfits.map((o: any) => [o.id, o]));
          outfitsToShow = data.outfits
            .map((lo: any) => outfitMap.get(lo.outfit_id))
            .filter(Boolean);
        }
      }

      if (outfitsToShow.length > 0) {
        // Pre-load all images BEFORE opening slideshow
        const imageMap = new Map<string, string | null>();
        const loadPromises = outfitsToShow.map(async (outfit) => {
          const url = await getOutfitCoverImageUrl(outfit);
          imageMap.set(outfit.id, url);
        });
        await Promise.all(loadPromises);
        
        // Now open the slideshow with images ready
        setSlideshowImages(imageMap);
        setSlideshowOutfits(outfitsToShow);
        setCurrentSlideIndex(0);
        setIsAutoPlaying(true);
        setSlideshowVisible(true);
      }
    } finally {
      setSlideshowLoading(false);
    }
  };

  const closeSlideshow = () => {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
    setSlideshowVisible(false);
    setSlideshowOutfits([]);
    setSlideshowImages(new Map());
    setCurrentSlideIndex(0);
    setIsAutoPlaying(true);
  };

  const nextSlide = () => {
    if (currentSlideIndex < slideshowOutfits.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      setCurrentSlideIndex(0);
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    } else {
      setCurrentSlideIndex(slideshowOutfits.length - 1);
    }
  };

  const handleManualNavigation = (direction: 'next' | 'prev') => {
    setIsAutoPlaying(false);
    if (direction === 'next') {
      nextSlide();
    } else {
      previousSlide();
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  // Auto-play effect
  useEffect(() => {
    if (slideshowVisible && isAutoPlaying && slideshowOutfits.length > 0) {
      const interval = setInterval(() => {
        nextSlide();
      }, 4000);
      setAutoPlayInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (autoPlayInterval) {
      clearInterval(autoPlayInterval);
      setAutoPlayInterval(null);
    }
  }, [slideshowVisible, isAutoPlaying, currentSlideIndex, slideshowOutfits.length]);

  return {
    slideshowVisible,
    slideshowLoading,
    slideshowOutfits,
    slideshowImages,
    currentSlideIndex,
    isAutoPlaying,
    openSlideshow,
    closeSlideshow,
    handleManualNavigation,
    toggleAutoPlay,
  };
};

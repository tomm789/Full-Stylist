/**
 * useSlideshow Hook
 * Manages slideshow state and navigation
 */

import { useState, useEffect } from 'react';
import { getOutfitCoverImageUrl } from '@/lib/images';

interface UseSlideshowProps {
  autoPlayInterval?: number;
}

interface UseSlideshowReturn {
  visible: boolean;
  loading: boolean;
  outfits: any[];
  images: Map<string, string | null>;
  currentIndex: number;
  isAutoPlaying: boolean;
  open: (outfits: any[]) => Promise<void>;
  close: () => void;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;
  toggleAutoPlay: () => void;
  pauseAutoPlay: () => void;
}

export function useSlideshow({
  autoPlayInterval = 4000,
}: UseSlideshowProps = {}): UseSlideshowReturn {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [images, setImages] = useState<Map<string, string | null>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const open = async (outfitsToShow: any[]) => {
    if (outfitsToShow.length === 0) return;

    setLoading(true);

    try {
      // Pre-load all images
      const imageMap = new Map<string, string | null>();
      const loadPromises = outfitsToShow.map(async (outfit) => {
        const url = await getOutfitCoverImageUrl(outfit);
        imageMap.set(outfit.id, url);
      });
      await Promise.all(loadPromises);

      setImages(imageMap);
      setOutfits(outfitsToShow);
      setCurrentIndex(0);
      setIsAutoPlaying(true);
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setVisible(false);
    setOutfits([]);
    setImages(new Map());
    setCurrentIndex(0);
    setIsAutoPlaying(true);
  };

  const next = () => {
    if (currentIndex < outfits.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
  };

  const previous = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(outfits.length - 1); // Loop to end
    }
  };

  const goTo = (index: number) => {
    if (index >= 0 && index < outfits.length) {
      setCurrentIndex(index);
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const pauseAutoPlay = () => {
    setIsAutoPlaying(false);
  };

  // Auto-play effect
  useEffect(() => {
    if (visible && isAutoPlaying && outfits.length > 0) {
      const interval = setInterval(() => {
        next();
      }, autoPlayInterval);
      setIntervalId(interval);

      return () => {
        clearInterval(interval);
      };
    } else if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [visible, isAutoPlaying, currentIndex, outfits.length]);

  return {
    visible,
    loading,
    outfits,
    images,
    currentIndex,
    isAutoPlaying,
    open,
    close,
    next,
    previous,
    goTo,
    toggleAutoPlay,
    pauseAutoPlay,
  };
}
